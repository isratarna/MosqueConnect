<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ComplaintResource;
use App\Models\Complaint;
use App\Models\Mosque;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * The mosque admin's complaints inbox.
 */
class ComplaintManagementController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request, Mosque $mosque): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [Complaint::class, $mosque]);

        $status = $request->validate([
            'status' => ['nullable', Rule::in([...Complaint::STATUSES, 'active'])],
        ])['status'] ?? null;

        return ComplaintResource::collection(
            $mosque->complaints()
                ->with('user:id,name')
                ->when($status === 'active', fn (Builder $query) => $query->open())
                ->when($status && $status !== 'active', fn (Builder $query) => $query->where('status', $status))
                ->latest('id')
                ->paginate(20),
        );
    }

    /**
     * Change the status and/or reply. A new reply notifies the author.
     */
    public function update(Request $request, Mosque $mosque, Complaint $complaint): ComplaintResource
    {
        Gate::authorize('respond', $complaint);

        $validated = $request->validate([
            'status' => ['required', Rule::in(Complaint::STATUSES)],
            'admin_response' => ['nullable', 'string', 'max:5000'],
        ]);

        $response = trim((string) ($validated['admin_response'] ?? ''));
        $replied = $response !== '' && $response !== (string) $complaint->admin_response;

        $complaint->fill(['status' => $validated['status']]);
        if ($replied) {
            $complaint->fill(['admin_response' => $response, 'responded_at' => now()]);
        }
        $complaint->save();

        if ($replied) {
            $this->notifications->notifyUser($complaint->user_id, $mosque, [
                'type' => Notification::TYPE_COMPLAINT,
                'title' => "{$mosque->name} replied to your feedback",
                'message' => Str::limit("Re: {$complaint->subject}. {$response}", 500),
                // One notification per reply: the reply time keeps the reference unique.
                'reference_type' => Notification::REFERENCE_COMPLAINT.':'.$complaint->responded_at->timestamp,
                'reference_id' => $complaint->id,
                'link' => '/profile?tab=feedback',
            ]);
        }

        return new ComplaintResource($complaint->refresh()->load('user:id,name'));
    }
}
