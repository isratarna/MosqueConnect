<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\CampaignIndexRequest;
use App\Http\Requests\StoreCampaignRequest;
use App\Http\Requests\StoreManualCampaignDonationRequest;
use App\Http\Requests\UpdateCampaignRequest;
use App\Http\Resources\CampaignDonationResource;
use App\Http\Resources\CampaignResource;
use App\Models\Campaign;
use App\Models\CampaignDonation;
use App\Models\Mosque;
use App\Services\CampaignDonationService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class CampaignManagementController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly CampaignDonationService $donations,
    ) {}

    public function index(CampaignIndexRequest $request, Mosque $mosque): AnonymousResourceCollection
    {
        Gate::authorize('view', $mosque);

        $campaigns = $mosque->campaigns()
            ->with(['mosque', 'creator'])
            ->withCount([
                'donations as supporters_count' => fn ($query) => $query->where('status', CampaignDonation::STATUS_CONFIRMED),
                'donations as pending_donations_count' => fn ($query) => $query->where('status', CampaignDonation::STATUS_PENDING),
            ])
            ->filter($request->validated())
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 15))
            ->withQueryString();

        return CampaignResource::collection($campaigns);
    }

    public function store(StoreCampaignRequest $request, Mosque $mosque): JsonResponse
    {
        $campaign = $mosque->campaigns()->create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'currency' => $request->validated('currency', 'BDT'),
            'status' => $request->validated('status', Campaign::STATUS_DRAFT),
        ]);

        if ($campaign->status === Campaign::STATUS_ACTIVE) {
            $this->notifications->notifyCampaignPublished($mosque, $campaign->id, $campaign->title);
        }

        return (new CampaignResource($this->hydrate($campaign)))
            ->additional(['message' => 'Campaign created successfully.'])
            ->response()
            ->setStatusCode(201);
    }

    public function show(Mosque $mosque, Campaign $campaign): CampaignResource
    {
        Gate::authorize('view', $campaign);

        return new CampaignResource($this->hydrate($campaign));
    }

    public function update(UpdateCampaignRequest $request, Mosque $mosque, Campaign $campaign): CampaignResource
    {
        $validated = $request->validated();
        $status = $validated['status'] ?? null;
        unset($validated['status']);
        $campaign->fill($validated);

        if ($status !== null) {
            $campaign->transitionTo($status);
        }

        $campaign->save();
        $this->notifyIfActivated($campaign);

        return (new CampaignResource($this->hydrate($campaign->refresh())))
            ->additional(['message' => 'Campaign updated successfully.']);
    }

    public function destroy(Mosque $mosque, Campaign $campaign): JsonResponse
    {
        Gate::authorize('delete', $campaign);
        $campaign->delete();

        return response()->json(['message' => 'Campaign deleted successfully.']);
    }

    public function activate(Mosque $mosque, Campaign $campaign): CampaignResource
    {
        if ($campaign->ends_on->isBefore(today())) {
            throw ValidationException::withMessages(['ends_on' => 'An expired campaign cannot be activated.']);
        }

        return $this->transition($campaign, Campaign::STATUS_ACTIVE, 'Campaign activated successfully.');
    }

    public function complete(Mosque $mosque, Campaign $campaign): CampaignResource
    {
        return $this->transition($campaign, Campaign::STATUS_COMPLETED, 'Campaign completed successfully.');
    }

    public function cancel(Mosque $mosque, Campaign $campaign): CampaignResource
    {
        return $this->transition($campaign, Campaign::STATUS_CANCELLED, 'Campaign cancelled successfully.');
    }

    public function expire(Mosque $mosque, Campaign $campaign): CampaignResource
    {
        if (! $campaign->ends_on->isBefore(today())) {
            throw ValidationException::withMessages(['status' => 'A campaign can only expire after its end date.']);
        }

        return $this->transition($campaign, Campaign::STATUS_EXPIRED, 'Campaign expired successfully.');
    }

    public function donationIndex(Request $request, Mosque $mosque, Campaign $campaign): AnonymousResourceCollection
    {
        Gate::authorize('view', $campaign);
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'in:pending,confirmed,rejected'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $items = $campaign->donations()
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->latest()
            ->paginate($request->integer('per_page', 20))
            ->withQueryString();

        return CampaignDonationResource::collection($items);
    }

    public function recordDonation(StoreManualCampaignDonationRequest $request, Mosque $mosque, Campaign $campaign): JsonResponse
    {
        $donation = $this->donations->recordManual($campaign, $request->user(), $request->validated());

        return (new CampaignDonationResource($donation))
            ->additional(['message' => 'Manual donation recorded and confirmed.'])
            ->response()
            ->setStatusCode(201);
    }

    public function confirmDonation(Request $request, Mosque $mosque, Campaign $campaign, CampaignDonation $donation): CampaignDonationResource
    {
        Gate::authorize('update', $campaign);
        $donation = $this->donations->confirm($donation, $request->user());

        return (new CampaignDonationResource($donation))
            ->additional(['message' => 'Donation confirmed successfully.']);
    }

    public function rejectDonation(Mosque $mosque, Campaign $campaign, CampaignDonation $donation): CampaignDonationResource
    {
        Gate::authorize('update', $campaign);
        $donation = $this->donations->reject($donation);

        return (new CampaignDonationResource($donation))
            ->additional(['message' => 'Donation rejected successfully.']);
    }

    private function transition(Campaign $campaign, string $status, string $message): CampaignResource
    {
        Gate::authorize('update', $campaign);
        if (! $campaign->canTransitionTo($status)) {
            throw ValidationException::withMessages([
                'status' => "The campaign status cannot transition from {$campaign->status} to {$status}.",
            ]);
        }

        $campaign->transitionTo($status);
        $campaign->save();
        $this->notifyIfActivated($campaign);

        return (new CampaignResource($this->hydrate($campaign->refresh())))->additional(['message' => $message]);
    }

    private function notifyIfActivated(Campaign $campaign): void
    {
        if ($campaign->wasChanged('status') && $campaign->status === Campaign::STATUS_ACTIVE) {
            $campaign->loadMissing('mosque');
            $this->notifications->notifyCampaignPublished($campaign->mosque, $campaign->id, $campaign->title);
        }
    }

    private function hydrate(Campaign $campaign): Campaign
    {
        return $campaign->load(['mosque', 'creator'])->loadCount([
            'donations as supporters_count' => fn ($query) => $query->where('status', CampaignDonation::STATUS_CONFIRMED),
            'donations as pending_donations_count' => fn ($query) => $query->where('status', CampaignDonation::STATUS_PENDING),
        ]);
    }
}
