<?php

namespace Tests\Feature;

use App\Models\Follower;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MosqueDiscoveryFollowTest extends TestCase
{
    use RefreshDatabase;

    public function test_nearby_mosques_are_returned_in_ascending_distance_order(): void
    {
        $far = Mosque::factory()->create([
            'name' => 'Far Mosque',
            'latitude' => 23.7000000,
            'longitude' => 90.4000000,
        ]);
        $near = Mosque::factory()->create([
            'name' => 'Near Mosque',
            'latitude' => 23.7291000,
            'longitude' => 90.4139000,
        ]);
        $middle = Mosque::factory()->create([
            'name' => 'Middle Mosque',
            'latitude' => 23.7200000,
            'longitude' => 90.4100000,
        ]);

        $this->getJson('/api/mosques/nearby?latitude=23.7290000&longitude=90.4138000')
            ->assertOk()
            ->assertJsonPath('data.0.id', $near->id)
            ->assertJsonPath('data.1.id', $middle->id)
            ->assertJsonPath('data.2.id', $far->id)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'address',
                        'latitude',
                        'longitude',
                        'phone',
                        'description',
                        'verification_status',
                        'distance_km',
                        'created_at',
                        'updated_at',
                    ],
                ],
            ]);
    }

    public function test_nearby_requires_latitude_and_longitude(): void
    {
        $this->getJson('/api/mosques/nearby')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['latitude', 'longitude']);
    }

    public function test_nearby_rejects_invalid_latitude_and_longitude(): void
    {
        $this->getJson('/api/mosques/nearby?latitude=91&longitude=not-a-number')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['latitude', 'longitude']);
    }

    public function test_nearby_returns_empty_list_when_no_mosques_exist(): void
    {
        $this->getJson('/api/mosques/nearby?latitude=23.7290000&longitude=90.4138000')
            ->assertOk()
            ->assertExactJson([
                'data' => [],
            ]);
    }

    public function test_mosque_details_can_be_fetched_by_id(): void
    {
        $mosque = Mosque::factory()->create([
            'name' => 'Baitul Test Mosque',
            'address' => '123 Test Road',
            'latitude' => 23.7290000,
            'longitude' => 90.4138000,
            'phone' => '+15555550100',
            'description' => 'Public detail test mosque.',
            'verification_status' => Mosque::VERIFICATION_PENDING,
        ]);

        $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $mosque->id)
            ->assertJsonPath('data.name', 'Baitul Test Mosque')
            ->assertJsonPath('data.verification_status', Mosque::VERIFICATION_PENDING);
    }

    public function test_missing_mosque_details_return_404(): void
    {
        $this->getJson('/api/mosques/999999')
            ->assertNotFound();
    }

    public function test_unauthenticated_user_cannot_follow_a_mosque(): void
    {
        $mosque = Mosque::factory()->create();

        $this->postJson("/api/mosques/{$mosque->id}/follow")
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_follow_a_mosque(): void
    {
        $user = User::factory()->create();
        $mosque = Mosque::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/mosques/{$mosque->id}/follow")
            ->assertCreated()
            ->assertJsonPath('message', 'Mosque followed successfully.')
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.mosque_id', $mosque->id);

        $this->assertDatabaseHas('followers', [
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
        ]);
    }

    public function test_following_a_mosque_twice_returns_conflict_without_duplicate_row(): void
    {
        $user = User::factory()->create();
        $mosque = Mosque::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/mosques/{$mosque->id}/follow")->assertCreated();

        $this->postJson("/api/mosques/{$mosque->id}/follow")
            ->assertConflict()
            ->assertJson([
                'message' => 'Already following this mosque.',
            ]);

        $this->assertSame(
            1,
            Follower::where('user_id', $user->id)
                ->where('mosque_id', $mosque->id)
                ->count(),
        );
    }

    public function test_following_a_missing_mosque_returns_404(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/mosques/999999/follow')
            ->assertNotFound();
    }

    public function test_unauthenticated_user_cannot_unfollow_a_mosque(): void
    {
        $mosque = Mosque::factory()->create();

        $this->deleteJson("/api/mosques/{$mosque->id}/follow")
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_unfollow_a_mosque_they_follow(): void
    {
        $user = User::factory()->create();
        $mosque = Mosque::factory()->create();
        Follower::factory()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
        ]);
        Sanctum::actingAs($user);

        $this->deleteJson("/api/mosques/{$mosque->id}/follow")
            ->assertOk()
            ->assertJson([
                'message' => 'Mosque unfollowed successfully.',
            ]);

        $this->assertDatabaseMissing('followers', [
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
        ]);
    }

    public function test_unfollowing_a_mosque_not_currently_followed_returns_404(): void
    {
        $user = User::factory()->create();
        $mosque = Mosque::factory()->create();
        Sanctum::actingAs($user);

        $this->deleteJson("/api/mosques/{$mosque->id}/follow")
            ->assertNotFound()
            ->assertJson([
                'message' => 'You are not following this mosque.',
            ]);
    }

    public function test_unfollowing_a_missing_mosque_returns_404(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->deleteJson('/api/mosques/999999/follow')
            ->assertNotFound();
    }

    public function test_unauthenticated_user_cannot_view_followed_mosques(): void
    {
        $this->getJson('/api/me/followed-mosques')
            ->assertUnauthorized();
    }

    public function test_followed_mosques_returns_real_database_rows_for_authenticated_user(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $first = Mosque::factory()->create(['name' => 'Alpha Mosque']);
        $second = Mosque::factory()->create(['name' => 'Beta Mosque']);
        $other = Mosque::factory()->create(['name' => 'Other User Mosque']);

        Follower::factory()->create(['user_id' => $user->id, 'mosque_id' => $second->id]);
        Follower::factory()->create(['user_id' => $user->id, 'mosque_id' => $first->id]);
        Follower::factory()->create(['user_id' => $otherUser->id, 'mosque_id' => $other->id]);

        Sanctum::actingAs($user);

        $this->getJson('/api/me/followed-mosques')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $first->id)
            ->assertJsonPath('data.1.id', $second->id);
    }

    public function test_followed_mosques_returns_empty_list_when_user_follows_nothing(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/me/followed-mosques')
            ->assertOk()
            ->assertExactJson([
                'data' => [],
            ]);
    }
}
