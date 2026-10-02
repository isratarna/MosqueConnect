<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContactMessageManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(ContactMessage::STATUSES)],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        return response()->json(
            ContactMessage::query()
                ->with('user:id,name,phone')
                ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
                ->latest('id')
                ->paginate($filters['per_page'] ?? 20),
        );
    }

    public function update(Request $request, ContactMessage $message): JsonResponse
    {
        $message->update($request->validate([
            'status' => ['required', Rule::in(ContactMessage::STATUSES)],
        ]));

        return response()->json([
            'message' => 'Message updated.',
            'data' => $message->refresh(),
        ]);
    }
}
