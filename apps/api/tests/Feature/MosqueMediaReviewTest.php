<?php

namespace Tests\Feature;

use App\Models\Mosque;
use App\Models\MosquePhoto;
use App\Models\MosqueReview;
use App\Models\PrayerTime;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MosqueMediaReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_upload_order_set_cover_and_delete_gallery_photos(): void
    {
        Storage::fake('public');
        [$admin, $mosque] = $this->adminMosque();
        Sanctum::actingAs($admin);

        $first = $this->post("/api/admin/mosques/{$mosque->id}/photos", [
            'photo' => $this->image('front.png'),
            'caption' => 'Front entrance',
        ], ['Accept' => 'application/json'])->assertCreated()->json('data');
        $second = $this->post("/api/admin/mosques/{$mosque->id}/photos", [
            'photo' => $this->image('prayer-hall.png'),
        ], ['Accept' => 'application/json'])->assertCreated()->json('data');

        $firstPhoto = MosquePhoto::query()->findOrFail($first['id']);
        $this->assertTrue(Storage::disk('public')->exists($firstPhoto->path));
        $this->patchJson("/api/admin/mosques/{$mosque->id}/photos/{$second['id']}", [
            'caption' => 'Main prayer hall',
            'sort_order' => 0,
        ])->assertOk()->assertJsonPath('data.caption', 'Main prayer hall');

        $this->patchJson("/api/admin/mosques/{$mosque->id}/photos/{$first['id']}/cover")
            ->assertOk()
            ->assertJsonPath('mosque.photo_url', $mosque->fresh()->photo_url);
        $this->assertDatabaseHas('mosques', ['id' => $mosque->id, 'photo_path' => $firstPhoto->path]);
        $this->seedPrayerTimes($mosque);
        $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonPath('data.photos.0.id', $second['id'])
            ->assertJsonPath('data.photos.0.url', $second['url'])
            ->assertJsonPath('data.photos.1.caption', 'Front entrance');
        $this->get("/api/mosques/{$mosque->id}/photo")->assertOk();

        $this->deleteJson("/api/admin/mosques/{$mosque->id}/photos/{$first['id']}")->assertOk();
        $this->assertDatabaseMissing('mosque_photos', ['id' => $first['id']]);
        Storage::disk('public')->assertMissing($firstPhoto->path);
        $this->assertNull($mosque->fresh()->photo_path);
    }

    public function test_admin_cannot_upload_more_than_ten_mosque_photos(): void
    {
        Storage::fake('public');
        [$admin, $mosque] = $this->adminMosque();
        for ($index = 0; $index < 10; $index++) {
            $mosque->photos()->create([
                'path' => "mosque-photos/{$mosque->id}/{$index}.png",
                'uploaded_by' => $admin->id,
            ]);
        }
        Sanctum::actingAs($admin);

        $this->post("/api/admin/mosques/{$mosque->id}/photos", [
            'photo' => $this->image('eleventh.png'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->assertDatabaseCount('mosque_photos', 10);
    }

    public function test_gallery_upload_rejects_non_image_files(): void
    {
        Storage::fake('public');
        [$admin, $mosque] = $this->adminMosque();
        Sanctum::actingAs($admin);

        $this->post("/api/admin/mosques/{$mosque->id}/photos", [
            'photo' => UploadedFile::fake()->create('notes.pdf', 32, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('photo');
    }

    public function test_gallery_upload_rejects_files_larger_than_four_megabytes(): void
    {
        Storage::fake('public');
        [$admin, $mosque] = $this->adminMosque();
        Sanctum::actingAs($admin);

        $this->post("/api/admin/mosques/{$mosque->id}/photos", [
            'photo' => UploadedFile::fake()->createWithContent(
                'oversized.png',
                $this->imageContent().str_repeat('x', 4097 * 1024),
            ),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('photo');
    }

    public function test_review_upsert_and_delete_recalculate_average_and_count(): void
    {
        $mosque = Mosque::factory()->create();
        $first = User::factory()->create();
        $second = User::factory()->create();

        Sanctum::actingAs($first);
        $this->putJson("/api/mosques/{$mosque->id}/reviews/me", ['rating' => 5, 'comment' => 'Excellent access.'])->assertOk();
        $this->putJson("/api/mosques/{$mosque->id}/reviews/me", ['rating' => 3, 'comment' => 'Updated review.'])->assertOk();
        Sanctum::actingAs($second);
        $this->putJson("/api/mosques/{$mosque->id}/reviews/me", ['rating' => 4])->assertOk();

        $this->assertDatabaseCount('mosque_reviews', 2);
        $this->assertDatabaseHas('mosques', ['id' => $mosque->id, 'rating_avg' => 3.5, 'reviews_count' => 2]);

        Sanctum::actingAs($first);
        $this->deleteJson("/api/mosques/{$mosque->id}/reviews/me")->assertOk();
        $this->assertDatabaseHas('mosques', ['id' => $mosque->id, 'rating_avg' => 4, 'reviews_count' => 1]);
    }

    public function test_hidden_review_is_excluded_from_public_list_and_rating(): void
    {
        $mosque = Mosque::factory()->create();
        $visibleUser = User::factory()->create();
        $hiddenUser = User::factory()->create();
        Sanctum::actingAs($visibleUser);
        $visible = $this->putJson("/api/mosques/{$mosque->id}/reviews/me", ['rating' => 4])->assertOk()->json('data.id');
        Sanctum::actingAs($hiddenUser);
        $hidden = $this->putJson("/api/mosques/{$mosque->id}/reviews/me", ['rating' => 2])->assertOk()->json('data.id');
        $superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        Sanctum::actingAs($superAdmin);

        $this->getJson('/api/super-admin/moderation?type=review&moderation_status=approved')
            ->assertOk()
            ->assertJsonCount(2, 'data');
        $this->patchJson("/api/super-admin/moderation/review/{$hidden}", ['moderation_status' => 'hidden'])
            ->assertOk()
            ->assertJsonPath('data.moderation_status', MosqueReview::MODERATION_HIDDEN);

        $this->getJson("/api/mosques/{$mosque->id}/reviews")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $visible);
        $this->assertDatabaseHas('mosques', ['id' => $mosque->id, 'rating_avg' => 4, 'reviews_count' => 1]);
    }

    public function test_reviews_can_be_reported_as_content(): void
    {
        $mosque = Mosque::factory()->create();
        Sanctum::actingAs(User::factory()->create());
        $review = $this->putJson("/api/mosques/{$mosque->id}/reviews/me", ['rating' => 1, 'comment' => 'Incorrect details.'])
            ->assertOk()
            ->json('data.id');

        $this->postJson('/api/reports', [
            'reportable_type' => 'review',
            'reportable_id' => $review,
            'category' => 'inaccurate',
            'reason' => 'This review contains inaccurate information.',
        ])->assertCreated()
            ->assertJsonPath('data.reportable_type', 'review')
            ->assertJsonPath('data.reportable_id', $review);
    }

    private function adminMosque(): array
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);

        return [$admin, $mosque];
    }

    private function seedPrayerTimes(Mosque $mosque): void
    {
        foreach (PrayerTime::PRAYERS as $index => $prayer) {
            PrayerTime::factory()->create([
                'mosque_id' => $mosque->id,
                'prayer' => $prayer,
                'adhan_time' => sprintf('%02d:00:00', 4 + $index),
                'jamaat_time' => sprintf('%02d:15:00', 4 + $index),
            ]);
        }
    }

    private function image(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, $this->imageContent());
    }

    private function imageContent(): string
    {
        return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pKkAAAAASUVORK5CYII=', true);
    }
}
