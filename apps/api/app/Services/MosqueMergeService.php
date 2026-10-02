<?php

namespace App\Services;

use App\Models\ContentReport;
use App\Models\Follower;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Folds a duplicate mosque into another and deletes the duplicate. The
 * target's own profile, prayer times and facilities are kept.
 */
class MosqueMergeService
{
    public function __construct(private readonly MosqueTeamService $teams) {}

    /**
     * @return array<string, int> How many records moved, by kind.
     */
    public function merge(Mosque $source, Mosque $target): array
    {
        abort_if($source->is($target), 422, 'A mosque cannot be merged into itself.');
        abort_if(
            $source->members()->accepted()->exists(),
            422,
            'This mosque has an admin team. Transfer or revoke its admins before merging it.',
        );

        $photo = $source->photo_path;

        $moved = DB::transaction(function () use ($source, $target): array {
            $moved = [];

            // A person who already follows the target keeps that one follow.
            // IDs are read first: MySQL cannot delete from a table it selects from (error 1093).
            $targetFollowers = Follower::query()->where('mosque_id', $target->id)->pluck('user_id');
            foreach ($targetFollowers->chunk(1000) as $userIds) {
                Follower::query()->where('mosque_id', $source->id)->whereIn('user_id', $userIds->all())->delete();
            }
            $moved['followers'] = Follower::query()->where('mosque_id', $source->id)->update(['mosque_id' => $target->id]);

            foreach (['events', 'announcements', 'campaigns', 'volunteer_opportunities'] as $table) {
                $moved[$table] = DB::table($table)->where('mosque_id', $source->id)->update(['mosque_id' => $target->id]);
            }

            $moved['claims'] = $this->moveClaims($source, $target);

            $duplicateNotifications = Notification::query()->where('mosque_id', $source->id)
                ->whereExists(fn ($query) => $query->select(DB::raw(1))
                    ->from('notifications as existing')
                    ->where('existing.mosque_id', $target->id)
                    ->whereColumn('existing.user_id', 'notifications.user_id')
                    ->whereColumn('existing.type', 'notifications.type')
                    ->whereColumn('existing.reference_type', 'notifications.reference_type')
                    ->whereColumn('existing.reference_id', 'notifications.reference_id'))
                ->pluck('id');
            foreach ($duplicateNotifications->chunk(1000) as $ids) {
                Notification::query()->whereIn('id', $ids->all())->delete();
            }
            $moved['notifications'] = Notification::query()->where('mosque_id', $source->id)->update(['mosque_id' => $target->id]);

            $moved['reports'] = ContentReport::query()
                ->where('reportable_type', 'mosque')
                ->where('reportable_id', $source->id)
                ->update(['reportable_id' => $target->id]);

            $source->members()->delete();
            $source->delete();

            return $moved;
        });

        if ($photo) {
            Storage::disk('local')->delete($photo);
        }

        return $moved;
    }

    /**
     * @return array<string, int> Content still attached to the mosque.
     */
    public function contentCounts(Mosque $mosque): array
    {
        return array_filter([
            'followers' => $mosque->followers()->count(),
            'events' => $mosque->events()->count(),
            'announcements' => $mosque->announcements()->count(),
            'campaigns' => $mosque->campaigns()->count(),
            'volunteer_opportunities' => $mosque->volunteerOpportunities()->count(),
            'claims' => $mosque->verificationRequests()->count(),
            'team_members' => $mosque->members()->count(),
        ]);
    }

    public function delete(Mosque $mosque): void
    {
        $teamUserIds = $mosque->members()->pluck('user_id')->filter()->all();
        $photo = $mosque->photo_path;

        DB::transaction(function () use ($mosque, $teamUserIds): void {
            $mosque->members()->delete();
            $mosque->delete();

            User::query()->whereKey($teamUserIds)->get()->each(fn (User $user) => $this->teams->syncUserRole($user));
        });

        if ($photo) {
            Storage::disk('local')->delete($photo);
        }
    }

    /**
     * Claims follow the mosque. An open claim that would duplicate the same
     * person's open claim on the target is closed instead.
     */
    private function moveClaims(Mosque $source, Mosque $target): int
    {
        $claims = VerificationRequest::query()->where('mosque_id', $source->id)->get();

        foreach ($claims as $claim) {
            $claim->mosque_id = $target->id;

            if (! $claim->isFinalized()) {
                $duplicate = VerificationRequest::query()
                    ->where('mosque_id', $target->id)
                    ->where('user_id', $claim->user_id)
                    ->whereIn('status', VerificationRequest::ACTIVE_STATUSES)
                    ->exists();

                if ($duplicate) {
                    $claim->status = VerificationRequest::STATUS_REJECTED;
                    $claim->review_note = "Closed automatically: mosque #{$source->id} was merged into #{$target->id}, where this applicant already has an open claim.";
                    $claim->reviewed_at = now();
                } else {
                    $claim->active_claim_key = VerificationRequest::activeClaimKeyFor($claim->user_id, $target->id);
                }
            }

            $claim->save();
        }

        return $claims->count();
    }
}
