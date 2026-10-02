<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGoodsDonationRequest;
use App\Http\Resources\GoodsDonationResource;
use App\Models\GoodsDonation;
use App\Models\Mosque;
use App\Models\MosqueMember;
use App\Models\Notification;
use App\Services\NotificationService;
use App\Support\MosqueAbility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GoodsDonationController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function store(StoreGoodsDonationRequest $request, Mosque $mosque): JsonResponse
    {
        $donation = $mosque->goodsDonations()->create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'status' => GoodsDonation::STATUS_PENDING,
        ]);

        // Everyone on the mosque's team who handles content hears about the pledge.
        MosqueMember::query()
            ->where('mosque_id', $mosque->id)
            ->accepted()
            ->pluck('role', 'user_id')
            ->filter(fn (string $role): bool => MosqueAbility::roleAllows($role, MosqueAbility::CONTENT))
            ->keys()
            ->each(fn (int $userId) => $this->notifications->notifyUser($userId, $mosque, [
                'type' => Notification::TYPE_GOODS_DONATION,
                'title' => 'New goods donation pledge',
                'message' => "{$request->user()->name} pledged {$donation->quantity} × {$donation->item_name} to {$mosque->name}.",
                'reference_type' => Notification::REFERENCE_GOODS_DONATION,
                'reference_id' => $donation->id,
                'link' => '/admin/dashboard?section=goods',
            ]));

        return response()->json([
            'message' => 'Thank you! The mosque will contact you about your donation.',
            'data' => new GoodsDonationResource($donation->load('mosque:id,name')),
        ], 201);
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        return GoodsDonationResource::collection(
            GoodsDonation::query()
                ->where('user_id', $request->user()->id)
                ->with('mosque:id,name')
                ->latest('id')
                ->get(),
        );
    }
}
