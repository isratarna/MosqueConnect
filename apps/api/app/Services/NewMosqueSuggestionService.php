<?php

namespace App\Services;

use App\Models\AdminAuditLog;
use App\Models\Mosque;
use App\Models\MosqueSuggestion;
use App\Models\Notification;
use App\Models\User;
use App\Services\Queries\MosqueQueryService;
use Illuminate\Support\Facades\DB;

/**
 * Community suggestions of mosques that are not in the system yet. Suggesting a
 * correction to a mosque that already exists is handled by MosqueSuggestionService.
 */
class NewMosqueSuggestionService
{
    public function __construct(private readonly MosqueQueryService $mosques) {}

    public function duplicateNearby(float $latitude, float $longitude): ?Mosque
    {
        return $this->mosques->nearby($latitude, $longitude, 0.05)->first();
    }

    /** @param array<string, mixed> $data */
    public function submit(User $user, array $data): MosqueSuggestion
    {
        return MosqueSuggestion::query()->create([
            ...$data,
            'user_id' => $user->id,
            'status' => MosqueSuggestion::STATUS_PENDING,
        ]);
    }

    public function approve(User $admin, MosqueSuggestion $suggestion): MosqueSuggestion
    {
        return DB::transaction(function () use ($admin, $suggestion): MosqueSuggestion {
            $locked = MosqueSuggestion::query()->lockForUpdate()->findOrFail($suggestion->id);
            abort_unless($locked->status === MosqueSuggestion::STATUS_PENDING, 422, 'This suggestion has already been reviewed.');

            $mosque = Mosque::query()->create([
                'name' => $locked->name,
                'address' => $locked->address,
                'district' => $locked->district,
                'area' => $locked->area,
                'latitude' => $locked->latitude,
                'longitude' => $locked->longitude,
                'phone' => $locked->phone,
                'verification_status' => Mosque::VERIFICATION_UNVERIFIED,
            ]);
            foreach ($locked->facilities ?? [] as $facility) {
                $mosque->facilities()->create(['facility_key' => $facility]);
            }

            $locked->update([
                'status' => MosqueSuggestion::STATUS_APPROVED,
                'reviewed_by' => $admin->id,
                'mosque_id' => $mosque->id,
            ]);
            AdminAuditLog::record($admin, 'mosque_suggestion.approved', $locked, ['mosque_id' => $mosque->id]);
            $this->notifySubmitter($locked, $mosque, 'approved');

            return $locked->load(['user', 'reviewer', 'mosque']);
        });
    }

    public function reject(User $admin, MosqueSuggestion $suggestion, string $note): MosqueSuggestion
    {
        return DB::transaction(function () use ($admin, $suggestion, $note): MosqueSuggestion {
            $locked = MosqueSuggestion::query()->lockForUpdate()->findOrFail($suggestion->id);
            abort_unless($locked->status === MosqueSuggestion::STATUS_PENDING, 422, 'This suggestion has already been reviewed.');

            $locked->update([
                'status' => MosqueSuggestion::STATUS_REJECTED,
                'reviewed_by' => $admin->id,
                'review_note' => $note,
            ]);
            AdminAuditLog::record($admin, 'mosque_suggestion.rejected', $locked, ['review_note' => $note]);
            $this->notifySubmitter($locked, null, 'rejected');

            return $locked->load(['user', 'reviewer', 'mosque']);
        });
    }

    private function notifySubmitter(MosqueSuggestion $suggestion, ?Mosque $mosque, string $status): void
    {
        $approved = $status === 'approved';
        Notification::query()->create([
            'user_id' => $suggestion->user_id,
            'mosque_id' => $mosque?->id,
            'type' => Notification::TYPE_SYSTEM,
            'title' => $approved ? 'Mosque suggestion approved' : 'Mosque suggestion not approved',
            'message' => $approved
                ? "Your suggestion was approved as {$mosque->name}. You can now submit a claim if you administer this mosque."
                : 'Your mosque suggestion was not approved. Review the note for more information.',
            'reference_type' => 'mosque_suggestion',
            'reference_id' => $suggestion->id,
        ]);
    }
}
