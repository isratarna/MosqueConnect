<?php

namespace App\Http\Controllers;

use App\Http\Requests\PlanJourneyRequest;
use App\Models\JourneyPlan;
use App\Services\Journey\JourneyPlannerService;
use App\Services\Journey\NoRouteException;
use App\Services\Journey\ReachabilityService;
use App\Services\Journey\RoutesUnavailableException;
use App\Services\Queries\MosqueQueryService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class JourneyController extends Controller
{
    /**
     * GET /api/mosques/catchable — "Next jamat you can catch" (Home card).
     */
    public function catchable(Request $request, MosqueQueryService $mosques, ReachabilityService $reachability): JsonResponse
    {
        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'mode' => ['sometimes', 'in:walk,drive'],
        ]);

        $lat = (float) $validated['lat'];
        $lng = (float) $validated['lng'];
        $mode = $validated['mode'] ?? 'walk';
        $radius = (float) config("journey.catchable.radius_km.{$mode}", 3);

        // Kacher mosque gula (nearest age), shob gula na, prothom 40 ta.
        $nearby = EloquentCollection::make(
            $mosques->nearby($lat, $lng, $radius)->take((int) config('journey.catchable.max_candidates', 40))->all(),
        )->loadMissing('jumuahSessions');

        $result = $reachability->catchable($lat, $lng, $mode, CarbonImmutable::now(config('prayer.timezone')), $nearby);

        return response()->json([
            'data' => $result['options'],
            'next' => $result['next'],
            'mode' => $mode,
            'radius_km' => $radius,
        ]);
    }

    /**
     * POST /api/journeys/plan — trip-er namaz gula ar route-er pasher mosque.
     * Same trip 15 min er moddhe abar chaile journey_plans theke cache dei.
     */
    public function plan(PlanJourneyRequest $request, JourneyPlannerService $planner): JsonResponse
    {
        $input = $request->plannerInput();
        $hash = $this->cacheKey($input);

        $cached = JourneyPlan::query()->fresh()->where('request_hash', $hash)->latest()->first();
        if ($cached) {
            return response()->json($this->payload($cached, true));
        }

        try {
            $result = $planner->plan($input);
        } catch (RoutesUnavailableException $exception) {
            return response()->json(['message' => $exception->getMessage()], 503);
        } catch (NoRouteException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        $plan = JourneyPlan::query()->create([
            'user_id' => $request->user('sanctum')?->id,
            'request_hash' => $hash,
            'request' => array_merge($input, ['depart_at' => $input['depart_at']->toIso8601String()]),
            'response' => $result['plan'],
            'routing_calls' => $result['routing_calls']['routes'] + $result['routing_calls']['matrix'],
            'expires_at' => now()->addMinutes((int) config('journey.plan.cache_minutes', 15)),
        ]);

        // Protita plan-e routing API te koyta call holo log kori (cost dekhar jonno).
        Log::info('journey.plan', ['plan_id' => $plan->id] + $result['routing_calls']);

        return response()->json($this->payload($plan, false), 201);
    }

    /**
     * GET /api/journeys/{plan} — share kora link. Cache expire holeo plan dekha jay.
     */
    public function show(JourneyPlan $journeyPlan): JsonResponse
    {
        return response()->json($this->payload($journeyPlan, true));
    }

    /** @return array<string, mixed> */
    private function payload(JourneyPlan $plan, bool $cached): array
    {
        return [
            'id' => $plan->id,
            'cached' => $cached,
            'expired' => $plan->expires_at->isPast(),
            'request' => $plan->request,
        ] + $plan->response;
    }

    /**
     * Cache key: origin/destination 3 decimal (~100 m) e round, departure 15 min
     * e round, ar mode + baki setting gula (egulo-o result bodlay).
     */
    private function cacheKey(array $input): string
    {
        $departSlot = intdiv($input['depart_at']->getTimestamp(), 900);

        return hash('sha256', json_encode([
            round($input['origin']['lat'], 3),
            round($input['origin']['lng'], 3),
            round($input['destination']['lat'], 3),
            round($input['destination']['lng'], 3),
            $input['mode'],
            $departSlot,
            $input['corridor_km'],
            $input['facilities'],
            $input['prayer_duration_min'],
        ]));
    }
}
