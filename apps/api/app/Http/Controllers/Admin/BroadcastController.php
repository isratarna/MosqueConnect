<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\SendBroadcast;
use App\Models\AdminAuditLog;
use App\Models\Broadcast;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BroadcastController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->validate(['per_page' => ['nullable', 'integer', 'between:1,100']])['per_page'] ?? 20;

        return response()->json(
            Broadcast::query()->with('sender:id,name')->latest('id')->paginate($perPage),
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'message' => ['required', 'string', 'max:2000'],
            'audience' => ['required', Rule::in(Broadcast::AUDIENCES)],
            'audience_value' => [
                'nullable',
                'string',
                'max:100',
                Rule::requiredIf(in_array($request->input('audience'), [Broadcast::AUDIENCE_ROLE, Broadcast::AUDIENCE_DISTRICT], true)),
                Rule::when($request->input('audience') === Broadcast::AUDIENCE_ROLE, [Rule::in(User::ROLES)]),
            ],
            // Relative app paths or https links only, never javascript: URLs.
            'link' => ['nullable', 'string', 'max:500', 'regex:#^(/(?!/)|https://)#'],
        ], [
            'link.regex' => 'The link must start with / (a page on this site) or https://.',
        ]);

        if ($validated['audience'] === Broadcast::AUDIENCE_ALL) {
            $validated['audience_value'] = null;
        }

        $broadcast = Broadcast::query()->create([...$validated, 'sender_id' => $request->user()->id]);
        $expected = $broadcast->recipients()->count();

        SendBroadcast::dispatch($broadcast);

        AdminAuditLog::record($request->user(), 'broadcast.sent', $broadcast, [
            'title' => $broadcast->title,
            'audience' => $broadcast->audience,
            'audience_value' => $broadcast->audience_value,
            'expected_recipients' => $expected,
        ]);

        return response()->json([
            'message' => "Broadcast queued for {$expected} user(s).",
            'data' => $broadcast->fresh()->load('sender:id,name'),
        ], 201);
    }
}
