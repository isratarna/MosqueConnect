<?php

namespace App\Http\Controllers;

use App\Http\Resources\MosqueEditSuggestionResource;
use App\Models\Mosque;
use App\Models\MosqueEditSuggestion;
use App\Services\MosqueSuggestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Signed-in users suggesting corrections and following up on their own.
 */
class MosqueSuggestionController extends Controller
{
    public function __construct(private readonly MosqueSuggestionService $suggestions) {}

    public function store(Request $request, Mosque $mosque): JsonResponse
    {
        $field = $request->validate([
            'field' => ['required', Rule::in(MosqueEditSuggestion::FIELDS)],
        ])['field'];

        $validated = $request->validate([
            'payload' => [$field === MosqueEditSuggestion::FIELD_OTHER ? 'nullable' : 'required', 'array'],
            ...MosqueSuggestionService::payloadRules($field),
            'note' => [$field === MosqueEditSuggestion::FIELD_OTHER ? 'required' : 'nullable', 'string', 'max:1000'],
        ], [
            'note.required' => 'Describe what is wrong so the reviewer can fix it.',
        ]);

        $suggestion = $this->suggestions->create(
            $mosque,
            $request->user(),
            $field,
            $validated['payload'] ?? [],
            $validated['note'] ?? null,
        );

        $accepted = $suggestion->status === MosqueEditSuggestion::STATUS_ACCEPTED;

        return response()->json([
            'message' => $accepted
                ? 'Thank you! As a trusted contributor, your correction is already live.'
                : 'Thank you! Your suggestion will be reviewed.',
            'data' => (new MosqueEditSuggestionResource($suggestion->load('mosque')))->resolve(),
        ], 201);
    }

    public function mine(Request $request): JsonResponse
    {
        $suggestions = $request->user()->editSuggestions()
            ->with(['mosque:id,name,address,verification_status'])
            ->latest('id')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $suggestions->map(fn (MosqueEditSuggestion $suggestion): array => (new MosqueEditSuggestionResource($suggestion))->resolve())->all(),
            'accepted_suggestions_count' => (int) $request->user()->accepted_suggestions_count,
            'trusted_contributor' => $request->user()->isTrustedContributor(),
        ]);
    }
}
