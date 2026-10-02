<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\GoodsDonationResource;
use App\Models\GoodsDonation;
use App\Models\Mosque;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class GoodsDonationManagementController extends Controller
{
    private const STATUS_MESSAGES = [
        GoodsDonation::STATUS_ACCEPTED => 'accepted your pledge',
        GoodsDonation::STATUS_RECEIVED => 'received your donation. Thank you',
        GoodsDonation::STATUS_DECLINED => 'is unable to accept your pledge',
    ];

    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request, Mosque $mosque): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [GoodsDonation::class, $mosque]);

        $status = $request->validate([
            'status' => ['nullable', Rule::in(GoodsDonation::STATUSES)],
        ])['status'] ?? null;

        return GoodsDonationResource::collection(
            $mosque->goodsDonations()
                ->with('user:id,name')
                ->when($status, fn (Builder $query, string $status) => $query->where('status', $status))
                ->latest('id')
                ->paginate(20),
        );
    }

    /**
     * Accept, mark received or decline a pledge, and tell the donor.
     */
    public function update(Request $request, Mosque $mosque, GoodsDonation $goodsDonation): JsonResponse
    {
        Gate::authorize('update', $goodsDonation);

        $status = $request->validate([
            'status' => ['required', Rule::in([GoodsDonation::STATUS_ACCEPTED, GoodsDonation::STATUS_RECEIVED, GoodsDonation::STATUS_DECLINED])],
        ])['status'];

        if (! $goodsDonation->canTransitionTo($status)) {
            return response()->json([
                'message' => "A {$goodsDonation->status} pledge cannot be marked {$status}.",
            ], 422);
        }

        $goodsDonation->update(['status' => $status, 'handled_by' => $request->user()->id]);

        if ($goodsDonation->user_id) {
            $this->notifications->notifyUser($goodsDonation->user_id, $mosque, [
                'type' => Notification::TYPE_GOODS_DONATION,
                'title' => 'Goods donation '.$status,
                'message' => "{$mosque->name} ".self::STATUS_MESSAGES[$status].": {$goodsDonation->quantity} × {$goodsDonation->item_name}.",
                // One notification per status the pledge reaches.
                'reference_type' => Notification::REFERENCE_GOODS_DONATION.':'.$status,
                'reference_id' => $goodsDonation->id,
                'link' => '/profile?tab=donations',
            ]);
        }

        return response()->json([
            'message' => 'Pledge updated.',
            'data' => new GoodsDonationResource($goodsDonation->refresh()->load('user:id,name')),
        ]);
    }
}
