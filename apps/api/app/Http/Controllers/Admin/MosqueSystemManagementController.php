<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Mosque;
use App\Models\User;
use App\Services\MosqueEditor;
use App\Services\MosqueMergeService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MosqueSystemManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'verification_status' => ['nullable', Rule::in(Mosque::VERIFICATION_STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $mosques = Mosque::query()
            ->with('owner:id,name,phone,role,account_status')
            ->withCount(['followers', 'events', 'campaigns', 'members as team_count' => fn (Builder $query) => $query->whereNotNull('accepted_at')])
            ->when($filters['verification_status'] ?? null, fn (Builder $query, string $status) => $query->where('verification_status', $status))
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(fn (Builder $query) => $query->where('name', 'like', "%{$search}%")->orWhere('address', 'like', "%{$search}%")))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20);

        return response()->json($mosques);
    }

    public function updateStatus(Request $request, Mosque $mosque): JsonResponse
    {
        $validated = $request->validate([
            'verification_status' => ['required', Rule::in(Mosque::VERIFICATION_STATUSES)],
            'review_note' => ['nullable', 'string', 'max:5000', 'required_if:verification_status,rejected'],
        ]);

        $before = $mosque->verification_status;
        $mosque->update(['verification_status' => $validated['verification_status']]);

        if ($mosque->owner && $mosque->verification_status === Mosque::VERIFICATION_VERIFIED) {
            $mosque->owner->update(['role' => User::ROLE_MOSQUE_ADMIN]);
        }

        AdminAuditLog::record($request->user(), 'mosque.verification_updated', $mosque, [
            'before' => $before,
            'after' => $mosque->verification_status,
            'review_note' => $validated['review_note'] ?? null,
        ]);

        return response()->json([
            'message' => 'Mosque verification status updated.',
            'data' => $mosque->fresh()->load('owner:id,name,phone,role,account_status'),
        ]);
    }

    public function update(Request $request, Mosque $mosque, MosqueEditor $editor): JsonResponse
    {
        $validated = $request->validate(MosqueEditor::profileRules());
        $fields = array_keys(array_diff_key($validated, ['facilities' => true]));
        $before = $mosque->only($fields);

        $updated = $editor->updateProfile($mosque, $validated);

        AdminAuditLog::record($request->user(), 'mosque.updated', $mosque, [
            'before' => $before,
            'after' => $updated->only($fields),
        ]);

        return response()->json([
            'message' => 'Mosque details updated.',
            'data' => $updated,
        ]);
    }

    public function merge(Request $request, Mosque $mosque, MosqueMergeService $merger): JsonResponse
    {
        $validated = $request->validate([
            'into_mosque_id' => ['required', 'integer', 'exists:mosques,id', Rule::notIn([$mosque->id])],
        ], [
            'into_mosque_id.not_in' => 'Choose a different mosque to merge into.',
        ]);

        $target = Mosque::query()->findOrFail($validated['into_mosque_id']);
        $source = $mosque->only(['id', 'name', 'address']);
        $moved = $merger->merge($mosque, $target);

        AdminAuditLog::record($request->user(), 'mosque.merged', $target, [
            'merged_mosque' => $source,
            'moved' => $moved,
        ]);

        return response()->json([
            'message' => "{$source['name']} was merged into {$target->name}.",
            'data' => ['into' => $target->fresh(), 'moved' => $moved],
        ]);
    }

    public function destroy(Request $request, Mosque $mosque, MosqueMergeService $merger): JsonResponse
    {
        $force = $request->boolean('force');
        $content = $merger->contentCounts($mosque);

        if ($content !== [] && ! $force) {
            return response()->json([
                'message' => 'This mosque still has content. Merge it into another mosque, or delete it with force.',
                'content' => $content,
            ], 409);
        }

        $snapshot = $mosque->only(['id', 'name', 'address', 'owner_id']);
        $merger->delete($mosque);

        AdminAuditLog::record($request->user(), 'mosque.deleted', 'Mosque', [
            'mosque' => $snapshot,
            'forced' => $force,
            'content' => $content,
        ]);

        return response()->json(['message' => "{$snapshot['name']} was deleted."]);
    }
}
