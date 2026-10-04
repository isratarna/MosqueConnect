<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CampaignUpdateResource;
use App\Jobs\NotifyCampaignSupporters;
use App\Models\Campaign;
use App\Models\CampaignUpdate;
use App\Models\Mosque;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class CampaignUpdateManagementController extends Controller
{
    public function index(Request $request, Mosque $mosque, Campaign $campaign): AnonymousResourceCollection
    {
        $this->authorizeManage($mosque, $campaign);
        $validated = $request->validate(['per_page' => ['sometimes', 'integer', 'between:1,100']]);
        $updates = $campaign->updates()
            ->with('poster:id,name')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return CampaignUpdateResource::collection($updates);
    }

    public function store(Request $request, Mosque $mosque, Campaign $campaign): JsonResponse
    {
        $this->authorizeManage($mosque, $campaign);
        $validated = $request->validate($this->rules());
        $imagePath = $request->file('image')?->store("campaign-updates/{$campaign->id}", 'public');
        unset($validated['image']);

        try {
            $update = $campaign->updates()->create([
                ...$validated,
                'image_path' => $imagePath,
                'posted_by' => $request->user()->id,
            ]);
        } catch (\Throwable $exception) {
            if ($imagePath !== null) {
                Storage::disk('public')->delete($imagePath);
            }
            throw $exception;
        }

        dispatch(new NotifyCampaignSupporters($update->id))->afterCommit();

        return (new CampaignUpdateResource($update->load('poster')))
            ->additional(['message' => 'Campaign update posted.'])
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, Mosque $mosque, Campaign $campaign, CampaignUpdate $update): CampaignUpdateResource
    {
        $this->authorizeManage($mosque, $campaign);
        abort_unless((int) $update->campaign_id === (int) $campaign->id, 404);
        $validated = $request->validate($this->rules(true));
        unset($validated['image']);
        $newImagePath = $request->file('image')?->store("campaign-updates/{$campaign->id}", 'public');
        $oldImagePath = $update->image_path;

        try {
            $update->fill($validated);
            if ($newImagePath !== null) {
                $update->image_path = $newImagePath;
            }
            $update->save();
        } catch (\Throwable $exception) {
            if ($newImagePath !== null) {
                Storage::disk('public')->delete($newImagePath);
            }
            throw $exception;
        }

        if ($newImagePath !== null && $oldImagePath !== null) {
            Storage::disk('public')->delete($oldImagePath);
        }

        return (new CampaignUpdateResource($update->refresh()->load('poster')))
            ->additional(['message' => 'Campaign update changed.']);
    }

    public function destroy(Mosque $mosque, Campaign $campaign, CampaignUpdate $update): JsonResponse
    {
        $this->authorizeManage($mosque, $campaign);
        abort_unless((int) $update->campaign_id === (int) $campaign->id, 404);
        $imagePath = $update->image_path;
        $update->delete();

        if ($imagePath !== null) {
            Storage::disk('public')->delete($imagePath);
        }

        return response()->json(['message' => 'Campaign update deleted.']);
    }

    private function authorizeManage(Mosque $mosque, Campaign $campaign): void
    {
        Gate::authorize('manageContent', $mosque);
        abort_unless((int) $campaign->mosque_id === (int) $mosque->id, 404);
        Gate::authorize('update', $campaign);
    }

    /** @return array<string, array<int, mixed>> */
    private function rules(bool $partial = false): array
    {
        $field = $partial ? 'sometimes' : 'required';

        return [
            'title' => [$field, 'string', 'max:255'],
            'body' => [$field, 'string', 'max:10000'],
            'amount_spent' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'image' => ['sometimes', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ];
    }
}