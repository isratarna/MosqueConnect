<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMosqueClaimRequest;
use App\Http\Resources\VerificationRequestResource;
use App\Models\Mosque;
use App\Models\VerificationRequest;
use App\Services\MosqueClaimService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MosqueClaimController extends Controller
{
    public function __construct(private readonly MosqueClaimService $claims) {}

    public function store(StoreMosqueClaimRequest $request): JsonResponse
    {
        $user = $request->user();
        $mosque = Mosque::query()->findOrFail($request->validated('mosque_id'));

        $claim = DB::transaction(fn () => $this->claims->create($user, $mosque, $request->validated()));

        return response()->json([
            'message' => 'Your mosque claim has been submitted for review.',
            'data' => new VerificationRequestResource($claim->load('mosque')),
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $claims = VerificationRequest::query()
            ->where('user_id', $request->user()->id)
            ->with('mosque')
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'data' => VerificationRequestResource::collection($claims),
        ]);
    }

    public function show(Request $request, VerificationRequest $claim): JsonResponse
    {
        abort_if((int) $claim->user_id !== (int) $request->user()->id, 403, 'Forbidden.');

        return response()->json([
            'data' => new VerificationRequestResource($claim->load('mosque')),
        ]);
    }
}
