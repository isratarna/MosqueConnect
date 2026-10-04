<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\MosquePaymentMethodResource;
use App\Models\Mosque;
use App\Models\MosquePaymentMethod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class MosquePaymentMethodController extends Controller
{
    public function index(Request $request, Mosque $mosque): AnonymousResourceCollection
    {
        Gate::authorize('manageContent', $mosque);
        $validated = $request->validate(['per_page' => ['sometimes', 'integer', 'between:1,100']]);
        $methods = $mosque->paymentMethods()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return MosquePaymentMethodResource::collection($methods);
    }

    public function store(Request $request, Mosque $mosque): JsonResponse
    {
        Gate::authorize('manageContent', $mosque);
        $method = $mosque->paymentMethods()->create($request->validate($this->rules()));

        return (new MosquePaymentMethodResource($method))
            ->additional(['message' => 'Payment method created.'])
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, Mosque $mosque, MosquePaymentMethod $paymentMethod): MosquePaymentMethodResource
    {
        Gate::authorize('manageContent', $mosque);
        abort_unless((int) $paymentMethod->mosque_id === (int) $mosque->id, 404);
        $paymentMethod->fill($request->validate($this->rules(true)))->save();

        return (new MosquePaymentMethodResource($paymentMethod->refresh()))
            ->additional(['message' => 'Payment method updated.']);
    }

    public function destroy(Mosque $mosque, MosquePaymentMethod $paymentMethod): JsonResponse
    {
        Gate::authorize('manageContent', $mosque);
        abort_unless((int) $paymentMethod->mosque_id === (int) $mosque->id, 404);
        $paymentMethod->delete();

        return response()->json(['message' => 'Payment method deleted.']);
    }

    /** @return array<string, array<int, mixed>> */
    private function rules(bool $partial = false): array
    {
        $field = $partial ? 'sometimes' : 'required';

        return [
            'type' => [$field, 'string', Rule::in(MosquePaymentMethod::TYPES)],
            'account_name' => [$field, 'string', 'max:255'],
            'account_number' => [$field, 'string', 'max:255'],
            'bank_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'branch' => ['sometimes', 'nullable', 'string', 'max:255'],
            'routing_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'instructions' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}