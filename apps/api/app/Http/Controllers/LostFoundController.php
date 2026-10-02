<?php

namespace App\Http\Controllers;

use App\Http\Resources\LostFoundItemResource;
use App\Models\LostFoundItem;
use App\Models\Mosque;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Community lost & found. Photos are stored on the private local disk and
 * served through the API, the same way mosque cover photos are.
 */
class LostFoundController extends Controller
{
    /**
     * Public list. Shows open items unless another status is asked for.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'type' => ['nullable', Rule::in(LostFoundItem::TYPES)],
            'mosque_id' => ['nullable', 'integer'],
            'category' => ['nullable', Rule::in(LostFoundItem::CATEGORIES)],
            'status' => ['nullable', Rule::in([...LostFoundItem::STATUSES, 'all'])],
            'per_page' => ['nullable', 'integer', 'between:1,50'],
        ]);

        $status = $filters['status'] ?? LostFoundItem::STATUS_OPEN;

        $items = LostFoundItem::query()
            ->visible()
            ->with('mosque:id,name,area')
            ->when($status !== 'all', fn (Builder $query) => $query->where('status', $status))
            ->when($filters['type'] ?? null, fn (Builder $query, string $type) => $query->where('type', $type))
            ->when($filters['mosque_id'] ?? null, fn (Builder $query, int $id) => $query->where('mosque_id', $id))
            ->when($filters['category'] ?? null, fn (Builder $query, string $category) => $query->where('category', $category))
            ->latest('occurred_on')
            ->latest('id')
            ->paginate($filters['per_page'] ?? 12);

        return LostFoundItemResource::collection($items);
    }

    public function show(Request $request, LostFoundItem $item): LostFoundItemResource
    {
        abort_unless($this->canSee($request, $item), 404);

        return new LostFoundItemResource($item->load(['mosque:id,name,area', 'user:id,name']));
    }

    public function photo(Request $request, LostFoundItem $item): StreamedResponse
    {
        abort_unless($this->canSee($request, $item), 404);
        abort_unless($item->photo_path && Storage::disk('local')->exists($item->photo_path), 404, 'This item has no photo.');

        return Storage::disk('local')->response($item->photo_path, null, [
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * The current user's own posts, in every status.
     */
    public function mine(Request $request): AnonymousResourceCollection
    {
        return LostFoundItemResource::collection(
            LostFoundItem::query()
                ->where('user_id', $request->user()->id)
                ->with('mosque:id,name,area')
                ->latest('id')
                ->get(),
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            ...$this->rules(),
            'type' => ['required', Rule::in(LostFoundItem::TYPES)],
        ]);

        $item = LostFoundItem::query()->create([
            ...collect($validated)->except('photo')->all(),
            'user_id' => $request->user()->id,
            'status' => LostFoundItem::STATUS_OPEN,
        ]);

        $this->storePhoto($request, $item);

        return response()->json([
            'message' => 'Your item has been posted.',
            'data' => new LostFoundItemResource($item->load(['mosque:id,name,area', 'user:id,name'])),
        ], 201);
    }

    public function update(Request $request, LostFoundItem $item): JsonResponse
    {
        Gate::authorize('update', $item);

        $validated = $request->validate([
            ...collect($this->rules())->map(fn (array $rules) => ['sometimes', ...$rules])->all(),
            'type' => ['sometimes', Rule::in(LostFoundItem::TYPES)],
            'remove_photo' => ['sometimes', 'boolean'],
        ]);

        $item->update(collect($validated)->except(['photo', 'remove_photo'])->all());

        if ($request->boolean('remove_photo') && $item->photo_path) {
            Storage::disk('local')->delete($item->photo_path);
            $item->forceFill(['photo_path' => null])->save();
        }

        $this->storePhoto($request, $item);

        return response()->json([
            'message' => 'Item updated.',
            'data' => new LostFoundItemResource($item->refresh()->load(['mosque:id,name,area', 'user:id,name'])),
        ]);
    }

    /**
     * Mark an item returned, close it, or reopen it.
     */
    public function updateStatus(Request $request, LostFoundItem $item): JsonResponse
    {
        Gate::authorize('updateStatus', $item);

        $validated = $request->validate([
            'status' => ['required', Rule::in(LostFoundItem::STATUSES)],
        ]);

        $item->update($validated);

        return response()->json([
            'message' => 'Item status updated.',
            'data' => new LostFoundItemResource($item->refresh()->load(['mosque:id,name,area', 'user:id,name'])),
        ]);
    }

    /**
     * Mosque admin: every item posted at their mosque, in every status.
     */
    public function adminIndex(Request $request, Mosque $mosque): AnonymousResourceCollection
    {
        Gate::authorize('manageContent', $mosque);

        $status = $request->validate([
            'status' => ['nullable', Rule::in(LostFoundItem::STATUSES)],
        ])['status'] ?? null;

        return LostFoundItemResource::collection(
            $mosque->lostFoundItems()
                ->with('user:id,name')
                ->when($status, fn (Builder $query, string $status) => $query->where('status', $status))
                ->latest('id')
                ->paginate(20),
        );
    }

    /**
     * @return array<string, list<mixed>>
     */
    private function rules(): array
    {
        return [
            'mosque_id' => ['nullable', 'integer', Rule::exists('mosques', 'id')],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'category' => ['required', Rule::in(LostFoundItem::CATEGORIES)],
            'occurred_on' => ['required', 'date', 'before_or_equal:today'],
            'location_note' => ['nullable', 'string', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ];
    }

    private function storePhoto(Request $request, LostFoundItem $item): void
    {
        if (! $request->hasFile('photo')) {
            return;
        }

        $previous = $item->photo_path;
        $item->forceFill(['photo_path' => $request->file('photo')->store("lost-found/{$item->id}", 'local')])->save();

        if ($previous && $previous !== $item->photo_path) {
            Storage::disk('local')->delete($previous);
        }
    }

    /**
     * Approved items are public. Held-back ones only reach their poster and the super admin.
     */
    private function canSee(Request $request, LostFoundItem $item): bool
    {
        if ($item->moderation_status === LostFoundItem::MODERATION_APPROVED) {
            return true;
        }

        $user = $request->user('sanctum');

        return $user && ((int) $user->id === (int) $item->user_id || $user->isSuperAdmin());
    }
}
