<?php

namespace App\Services;

use App\Models\Mosque;
use App\Models\MosqueReview;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class MosqueReviewService
{
    /** @param array{rating: int, comment?: string|null} $data */
    public function upsert(Mosque $mosque, User $user, array $data): MosqueReview
    {
        return DB::transaction(function () use ($mosque, $user, $data): MosqueReview {
            $lockedMosque = Mosque::query()->lockForUpdate()->findOrFail($mosque->id);
            $review = $lockedMosque->reviews()->updateOrCreate(
                ['user_id' => $user->id],
                ['rating' => $data['rating'], 'comment' => $data['comment'] ?? null],
            );
            $this->recalculate($lockedMosque);

            return $review->load('user');
        });
    }

    public function delete(Mosque $mosque, User $user): bool
    {
        return DB::transaction(function () use ($mosque, $user): bool {
            $lockedMosque = Mosque::query()->lockForUpdate()->findOrFail($mosque->id);
            $deleted = $lockedMosque->reviews()->where('user_id', $user->id)->delete() > 0;
            $this->recalculate($lockedMosque);

            return $deleted;
        });
    }

    public function setModerationStatus(MosqueReview $review, string $status): MosqueReview
    {
        return DB::transaction(function () use ($review, $status): MosqueReview {
            $mosque = Mosque::query()->lockForUpdate()->findOrFail($review->mosque_id);
            $lockedReview = MosqueReview::query()->lockForUpdate()->findOrFail($review->id);
            $lockedReview->moderation_status = $status;
            $lockedReview->save();
            $this->recalculate($mosque);

            return $lockedReview;
        });
    }

    public function recalculate(Mosque $mosque): void
    {
        $approvedReviews = $mosque->reviews()->where('moderation_status', MosqueReview::MODERATION_APPROVED);
        $count = (clone $approvedReviews)->count();
        $average = $count > 0 ? (clone $approvedReviews)->avg('rating') : null;

        $mosque->forceFill([
            'rating_avg' => $average === null ? null : round((float) $average, 1),
            'reviews_count' => $count,
        ])->save();
    }
}
