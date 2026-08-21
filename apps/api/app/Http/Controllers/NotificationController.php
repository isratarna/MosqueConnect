<?php

namespace App\Http\Controllers;

use App\Http\Requests\NotificationIndexRequest;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationController extends Controller
{
    public function index(NotificationIndexRequest $request): AnonymousResourceCollection
    {
        $notifications = $request->user()
            ->notifications()
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
}
