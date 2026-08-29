<?php

namespace App\Http\Controllers;

use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;
use App\Models\Mosque;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class AnnouncementController extends Controller
{
    public function index(Mosque $mosque): AnonymousResourceCollection
    {
        $announcements = $mosque->announcements()
            ->with(['mosque', 'creator'])
            ->published()
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get();

        return AnnouncementResource::collection($announcements);
    }

    public function adminIndex(Mosque $mosque): AnonymousResourceCollection
    {
        Gate::authorize('view', $mosque);

        $announcements = $mosque->announcements()
            ->with(['mosque', 'creator'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return AnnouncementResource::collection($announcements);
    }

    public function adminShow(Mosque $mosque, Announcement $announcement): AnnouncementResource
    {
        Gate::authorize('view', $announcement);

        return new AnnouncementResource($announcement->load(['mosque', 'creator']));
    }

    public function show(Announcement $announcement): AnnouncementResource
    {
        abort_unless($announcement->status === Announcement::STATUS_PUBLISHED, 404);

        return new AnnouncementResource($announcement->load(['mosque', 'creator']));
    }

    public function store(Mosque $mosque): JsonResponse
    {
        Gate::authorize('create', [Announcement::class, $mosque]);

        $validated = request()->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:10000'],
            'urgency' => ['required', 'string', 'in:low,medium,high'],
            'status' => ['sometimes', 'string', 'in:draft,published'],
        ]);

        $announcement = $mosque->announcements()->create([
            ...$validated,
            'created_by' => request()->user()->id,
            'published_at' => $this->resolvePublishedAt($validated['status'] ?? Announcement::STATUS_DRAFT),
        ]);

        return (new AnnouncementResource($announcement->load(['mosque', 'creator'])))
            ->additional(['message' => 'Announcement created successfully.'])
            ->response()
            ->setStatusCode(201);
    }

    public function update(Mosque $mosque, Announcement $announcement): AnnouncementResource
    {
        Gate::authorize('update', $announcement);

        $validated = request()->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'body' => ['sometimes', 'required', 'string', 'max:10000'],
            'urgency' => ['sometimes', 'required', 'string', 'in:low,medium,high'],
            'status' => ['sometimes', 'required', 'string', 'in:draft,published'],
        ]);

        $status = $validated['status'] ?? null;
        unset($validated['status']);

        $announcement->fill($validated);

        if ($status !== null) {
            $announcement->status = $status;
            $announcement->published_at = $status === Announcement::STATUS_PUBLISHED ? ($announcement->published_at ?? now()) : null;
        }

        $announcement->save();

        return (new AnnouncementResource($announcement->refresh()->load(['mosque', 'creator'])))
            ->additional(['message' => 'Announcement updated successfully.']);
    }

    public function destroy(Mosque $mosque, Announcement $announcement): JsonResponse
    {
        Gate::authorize('delete', $announcement);
        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted successfully.']);
    }

    public function publish(Mosque $mosque, Announcement $announcement): AnnouncementResource
    {
        Gate::authorize('update', $announcement);

        $announcement->status = Announcement::STATUS_PUBLISHED;
        $announcement->published_at = $announcement->published_at ?? now();
        $announcement->save();

        return (new AnnouncementResource($announcement->refresh()->load(['mosque', 'creator'])))
            ->additional(['message' => 'Announcement published successfully.']);
    }

    public function unpublish(Mosque $mosque, Announcement $announcement): AnnouncementResource
    {
        Gate::authorize('update', $announcement);

        $announcement->status = Announcement::STATUS_DRAFT;
        $announcement->published_at = null;
        $announcement->save();

        return (new AnnouncementResource($announcement->refresh()->load(['mosque', 'creator'])))
            ->additional(['message' => 'Announcement unpublished successfully.']);
    }

    private function resolvePublishedAt(string $status): ?string
    {
        return $status === Announcement::STATUS_PUBLISHED ? now()->toDateTimeString() : null;
    }
}
