<?php

namespace App\Http\Controllers;

use App\Http\Requests\NotificationIndexRequest;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use App\Models\NotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationController extends Controller
{
    public function index(NotificationIndexRequest $request): AnonymousResourceCollection
    {
        $notifications = $request->user()
            ->notifications()
            ->when($request->filled('type'), fn ($query) => $query->where('type', $request->query('type')))
            ->when($request->boolean('unread'), fn ($query) => $query->where('is_read', false))
            ->with('mosque:id,name')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 15))
            ->withQueryString();

        return NotificationResource::collection($notifications);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'count' => $request->user()->notifications()->where('is_read', false)->count(),
        ]);
    }

    public function markAsRead(Request $request, Notification $notification): NotificationResource
    {
        abort_unless($notification->user_id === $request->user()->id, 404);

        if (! $notification->is_read) {
            $notification->update(['is_read' => true]);
        }

        return (new NotificationResource($notification->refresh()->load('mosque:id,name')))
            ->additional(['message' => 'Notification marked as read.']);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $updated = $request->user()
            ->notifications()
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'message' => 'All notifications marked as read.',
            'updated_count' => $updated,
        ]);
    }

    public function preferences(Request $request): JsonResponse
    {
        $preferences = $request->user()->notificationPreferences()->firstOrCreate([], NotificationPreference::DEFAULTS);

        return response()->json(['data' => $preferences]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'announcement' => ['sometimes', 'boolean'],
            'event' => ['sometimes', 'boolean'],
            'campaign' => ['sometimes', 'boolean'],
            'prayer_schedule' => ['sometimes', 'boolean'],
            'blood' => ['sometimes', 'boolean'],
            'push_enabled' => ['sometimes', 'boolean'],
            'email_digest' => ['sometimes', 'boolean'],
        ]);

        if ($validated === []) {
            abort(422, 'At least one notification preference is required.');
        }

        $preferences = $request->user()->notificationPreferences()->firstOrCreate([], NotificationPreference::DEFAULTS);
        $preferences->fill($validated)->save();

        return response()->json(['data' => $preferences->refresh()]);
    }

    public function destroy(Request $request, Notification $notification): JsonResponse
    {
        abort_unless((int) $notification->user_id === (int) $request->user()->id, 404);
        $notification->delete();

        return response()->json(['message' => 'Notification deleted.']);
    }

    public function clearRead(Request $request): JsonResponse
    {
        $request->validate(['read' => ['required', 'in:1']]);
        $deleted = $request->user()->notifications()->where('is_read', true)->delete();

        return response()->json(['message' => 'Read notifications deleted.', 'deleted_count' => $deleted]);
    }
}
