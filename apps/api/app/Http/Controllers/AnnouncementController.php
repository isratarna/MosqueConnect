<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnnouncementIndexRequest;
use App\Http\Resources\AnnouncementResource;
use App\Jobs\NotifyMosqueFollowers;
use App\Models\Announcement;
use App\Models\Mosque;
use App\Models\Notification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AnnouncementController extends Controller
{
    public function feed(AnnouncementIndexRequest $request): AnonymousResourceCollection
    {
        $announcements = Announcement::query()
            ->published()
            ->filter($request->validated())
            ->with(['mosque', 'creator'])
            ->publicOrder()
            ->paginate($request->integer('per_page', 15))
            ->withQueryString();

        return AnnouncementResource::collection($announcements);
    }

    public function index(Mosque $mosque, Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'per_page' => ['sometimes', 'integer', 'between:1,50'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $announcements = $mosque->announcements()
            ->published()
            ->with(['mosque', 'creator'])
            ->publicOrder()
            ->paginate($filters['per_page'] ?? 10)
            ->withQueryString();

        return AnnouncementResource::collection($announcements);
    }

    public function adminIndex(Mosque $mosque): AnonymousResourceCollection
    {
        Gate::authorize('manageContent', $mosque);

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
        abort_unless(Announcement::query()->published()->whereKey($announcement->id)->exists(), 404);

        return new AnnouncementResource($announcement->load(['mosque', 'creator']));
    }

    public function store(Request $request, Mosque $mosque): JsonResponse
    {
        Gate::authorize('create', [Announcement::class, $mosque]);

        $validated = $request->validate($this->writeRules(false));
        $category = $validated['category'] ?? Announcement::CATEGORY_GENERAL;
        $status = $this->resolveStatus($validated['status'] ?? Announcement::STATUS_DRAFT, $validated['publish_at'] ?? null);
        $this->validatePinLimit($mosque, (bool) ($validated['is_pinned'] ?? false));
        $this->validateExpiryOrder($validated['publish_at'] ?? null, $validated['expires_at'] ?? null);
        unset($validated['status']);

        $announcement = $mosque->announcements()->create([
            ...$validated,
            'category' => $category,
            'urgency' => $validated['urgency'] ?? $this->defaultUrgencyFor($category),
            'status' => $status,
            'created_by' => $request->user()->id,
            'published_at' => $status === Announcement::STATUS_PUBLISHED ? ($validated['publish_at'] ?? now()) : null,
        ]);

        if ($request->hasFile('image')) {
            $this->storeImage($request, $mosque, $announcement);
        }

        $this->notifyIfPublished($mosque, $announcement);

        return (new AnnouncementResource($announcement->load(['mosque', 'creator'])))
            ->additional(['message' => 'Announcement created successfully.'])
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, Mosque $mosque, Announcement $announcement): AnnouncementResource
    {
        Gate::authorize('update', $announcement);

        $validated = $request->validate($this->writeRules(true));
        $image = $request->file('image');
        unset($validated['image']);
        $category = $validated['category'] ?? $announcement->category;
        $status = $this->resolveStatus($validated['status'] ?? $announcement->status, $validated['publish_at'] ?? $announcement->publish_at?->toDateTimeString());

        if (array_key_exists('is_pinned', $validated)) {
            $this->validatePinLimit($mosque, (bool) $validated['is_pinned'], $announcement->id);
        }

        $this->validateExpiryOrder(
            $validated['publish_at'] ?? $announcement->publish_at?->toDateTimeString(),
            $validated['expires_at'] ?? $announcement->expires_at?->toDateTimeString(),
        );
        unset($validated['status']);

        $announcement->fill($validated);
        $announcement->category = $category;
        $announcement->status = $status;
        $announcement->published_at = $status === Announcement::STATUS_PUBLISHED
            ? ($announcement->published_at ?? $announcement->publish_at ?? now())
            : null;
        $announcement->save();

        if ($image !== null) {
            $this->storeImage($request, $mosque, $announcement);
        }

        if ($announcement->wasChanged('status')) {
            $this->notifyIfPublished($mosque, $announcement);
        }

        return (new AnnouncementResource($announcement->refresh()->load(['mosque', 'creator'])))
            ->additional(['message' => 'Announcement updated successfully.']);
    }

    public function destroy(Mosque $mosque, Announcement $announcement): JsonResponse
    {
        Gate::authorize('delete', $announcement);
        $this->deleteImage($announcement);
        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted successfully.']);
    }

    public function publish(Mosque $mosque, Announcement $announcement): AnnouncementResource
    {
        Gate::authorize('update', $announcement);

        $announcement->status = Announcement::STATUS_PUBLISHED;
        $announcement->publish_at = now();
        $announcement->published_at = $announcement->published_at ?? now();
        $announcement->save();

        if ($announcement->wasChanged('status')) {
            $this->notifyIfPublished($mosque, $announcement);
        }

        return (new AnnouncementResource($announcement->refresh()->load(['mosque', 'creator'])))
            ->additional(['message' => 'Announcement published successfully.']);
    }

    public function unpublish(Mosque $mosque, Announcement $announcement): AnnouncementResource
    {
        Gate::authorize('update', $announcement);

        $announcement->status = Announcement::STATUS_DRAFT;
        $announcement->published_at = null;
        $announcement->publish_at = null;
        $announcement->save();

        return (new AnnouncementResource($announcement->refresh()->load(['mosque', 'creator'])))
            ->additional(['message' => 'Announcement unpublished successfully.']);
    }

    /**
     * Shared write rules for store and update.
     *
     * @return array<string, array<int, mixed>>
     */
    private function writeRules(bool $partial): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return [
            'title' => [$required, 'string', 'max:255'],
            'body' => [$required, 'string', 'max:10000'],
            'urgency' => ['sometimes', 'string', Rule::in(Announcement::URGENCIES)],
            'status' => ['sometimes', 'string', Rule::in(Announcement::INITIAL_STATUSES)],
            'publish_at' => ['sometimes', 'nullable', 'date'],
            'expires_at' => ['sometimes', 'nullable', 'date'],
            'is_pinned' => ['sometimes', 'boolean'],
            'category' => ['sometimes', 'string', Rule::in(Announcement::CATEGORIES)],
            'image' => ['sometimes', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ];
    }

    /**
     * Notify followers the first time an announcement is published. The
     * notification service skips followers already notified about it.
     */
    private function notifyIfPublished(Mosque $mosque, Announcement $announcement): void
    {
        if ($announcement->status !== Announcement::STATUS_PUBLISHED) {
            return;
        }

        $title = $announcement->category === Announcement::CATEGORY_JANAZAH
            ? 'Janazah: '.$announcement->title
            : $announcement->title;

        dispatch(new NotifyMosqueFollowers(
            $mosque->id,
            Notification::TYPE_ANNOUNCEMENT,
            Str::limit("New Announcement: {$title}", 255, ''),
            Str::limit("{$mosque->name} published a new announcement: {$title}.", 10000, ''),
            ['type' => Notification::REFERENCE_ANNOUNCEMENT, 'id' => $announcement->id],
        ))->afterCommit();
    }

    private function storeImage(Request $request, Mosque $mosque, Announcement $announcement): void
    {
        $path = $request->file('image')->store("announcements/{$mosque->id}", 'public');

        try {
            $this->deleteImage($announcement);
            $announcement->image_path = $path;
            $announcement->save();
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($path);
            throw $exception;
        }
    }

    private function deleteImage(Announcement $announcement): void
    {
        if ($announcement->image_path !== null) {
            Storage::disk('public')->delete($announcement->image_path);
        }
    }

    private function validatePinLimit(Mosque $mosque, bool $pinned, ?int $exceptId = null): void
    {
        $pinnedCount = $mosque->announcements()
            ->where('is_pinned', true)
            ->when($exceptId, fn (Builder $query) => $query->whereKeyNot($exceptId))
            ->count();

        if ($pinned && $pinnedCount >= Announcement::MAX_PINNED) {
            throw ValidationException::withMessages([
                'is_pinned' => 'A mosque can have at most '.Announcement::MAX_PINNED.' pinned announcements.',
            ]);
        }
    }

    /**
     * An expiry date is only meaningful relative to the publish date, which is
     * why the two are compared here instead of with a conditional rule.
     */
    private function validateExpiryOrder(?string $publishAt, ?string $expiresAt): void
    {
        if ($publishAt !== null && $expiresAt !== null && $expiresAt <= $publishAt) {
            throw ValidationException::withMessages([
                'expires_at' => 'The expiry date must be after the publish date.',
            ]);
        }
    }

    private function defaultUrgencyFor(string $category): string
    {
        return $category === Announcement::CATEGORY_JANAZAH
            ? Announcement::URGENCY_HIGH
            : Announcement::URGENCY_LOW;
    }

    /**
     * An announcement scheduled for the future is stored as scheduled; the
     * announcements:publish-scheduled command publishes it once it is due.
     */
    private function resolveStatus(string $requested, ?string $publishAt): string
    {
        if ($publishAt !== null && now()->lt($publishAt)) {
            return Announcement::STATUS_SCHEDULED;
        }

        return $requested;
    }
}
