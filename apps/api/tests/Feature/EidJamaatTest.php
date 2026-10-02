<?php

namespace Tests\Feature;

use App\Models\EidJamaat;
use App\Models\Follower;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EidJamaatTest extends TestCase
{
    use RefreshDatabase;

    // Near Baitul Mukarram, Dhaka.
    private const ORIGIN = ['lat' => 23.7296, 'lng' => 90.4125];

    public function test_verified_admin_can_add_jamaats_including_one_at_a_separate_field(): void
    {
        [$admin, $mosque] = $this->adminWithMosque();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/eid-jamaats", [
            'eid' => 'adha',
            'date' => '2027-05-17',
            'jamaat_time' => '07:00',
            'location_name' => 'Main hall',
            'khutbah_language' => 'Bangla',
            'women_arrangement' => true,
        ])->assertCreated()
            ->assertJsonPath('data.sequence', 1)
            ->assertJsonPath('data.year', 2027)
            ->assertJsonPath('data.at_mosque', true)
            ->assertJsonPath('data.latitude', (float) $mosque->latitude)
            ->assertJsonPath('data.published', false);

        $this->postJson("/api/admin/mosques/{$mosque->id}/eid-jamaats", [
            'eid' => 'adha',
            'date' => '2027-05-17',
            'jamaat_time' => '08:30',
            'location_name' => 'Eidgah field',
            'latitude' => 23.7400,
            'longitude' => 90.4200,
        ])->assertCreated()
            ->assertJsonPath('data.sequence', 2)
            ->assertJsonPath('data.at_mosque', false)
            ->assertJsonPath('data.latitude', 23.74)
            ->assertJsonPath('data.women_arrangement', false);

        $this->getJson("/api/admin/mosques/{$mosque->id}/eid-jamaats")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.jamaat_time', '07:00')
            ->assertJsonPath('data.1.location_name', 'Eidgah field');
    }

    public function test_jamaat_input_is_validated(): void
    {
        [$admin, $mosque] = $this->adminWithMosque();
        EidJamaat::factory()->create(['mosque_id' => $mosque->id, 'sequence' => 1]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/eid-jamaats", [
            'eid' => 'adha',
            'date' => '2027-05-17',
            'jamaat_time' => '08:30',
            'sequence' => 1,
        ])->assertUnprocessable()->assertJsonValidationErrors('sequence');

        $this->postJson("/api/admin/mosques/{$mosque->id}/eid-jamaats", [
            'eid' => 'qurbani',
            'date' => 'next week',
            'jamaat_time' => '8am',
            'latitude' => 23.74,
        ])->assertUnprocessable()->assertJsonValidationErrors(['eid', 'date', 'jamaat_time', 'longitude']);
    }

    public function test_only_the_verified_owner_can_manage_a_mosques_jamaats(): void
    {
        [, $mosque] = $this->adminWithMosque();
        $jamaat = EidJamaat::factory()->create(['mosque_id' => $mosque->id]);
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]));

        $this->getJson("/api/admin/mosques/{$mosque->id}/eid-jamaats")->assertForbidden();
        $this->postJson("/api/admin/mosques/{$mosque->id}/eid-jamaats", [
            'eid' => 'adha', 'date' => '2027-05-17', 'jamaat_time' => '08:30',
        ])->assertForbidden();
        $this->patchJson("/api/admin/mosques/{$mosque->id}/eid-jamaats/{$jamaat->id}", ['jamaat_time' => '09:00'])->assertForbidden();
        $this->deleteJson("/api/admin/mosques/{$mosque->id}/eid-jamaats/{$jamaat->id}")->assertForbidden();
        $this->postJson("/api/admin/mosques/{$mosque->id}/eid-jamaats/publish", ['eid' => 'adha', 'year' => 2027])->assertForbidden();

        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/admin/mosques/{$mosque->id}/eid-jamaats")->assertForbidden();
    }

    public function test_admin_can_update_and_delete_jamaats_of_their_own_mosque_only(): void
    {
        [$admin, $mosque] = $this->adminWithMosque();
        $jamaat = EidJamaat::factory()->create(['mosque_id' => $mosque->id]);
        $otherJamaat = EidJamaat::factory()->create();
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/eid-jamaats/{$jamaat->id}", [
            'jamaat_time' => '09:15',
            'women_arrangement' => true,
        ])->assertOk()
            ->assertJsonPath('data.jamaat_time', '09:15')
            ->assertJsonPath('data.women_arrangement', true);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/eid-jamaats/{$otherJamaat->id}", ['jamaat_time' => '09:15'])
            ->assertNotFound();

        $this->deleteJson("/api/admin/mosques/{$mosque->id}/eid-jamaats/{$jamaat->id}")->assertOk();
        $this->assertModelMissing($jamaat);
        $this->assertModelExists($otherJamaat);
    }

    public function test_publishing_notifies_followers_once_per_eid(): void
    {
        [$admin, $mosque] = $this->adminWithMosque();
        $follower = Follower::factory()->create(['mosque_id' => $mosque->id]);
        Follower::factory()->create();
        EidJamaat::factory()->create(['mosque_id' => $mosque->id, 'jamaat_time' => '07:00', 'sequence' => 1]);
        EidJamaat::factory()->create([
            'mosque_id' => $mosque->id,
            'jamaat_time' => '08:30',
            'sequence' => 2,
            'location_name' => 'Eidgah field',
        ]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/eid-jamaats/publish", ['eid' => 'adha', 'year' => 2027])
            ->assertOk()
            ->assertJsonPath('published_count', 2)
            ->assertJsonPath('data.0.published', true);

        $this->assertSame(1, Notification::query()->count());
        $this->assertDatabaseHas('notifications', [
            'user_id' => $follower->user_id,
            'mosque_id' => $mosque->id,
            'type' => Notification::TYPE_EID,
            'title' => 'Eid jamaat times published',
            'message' => "{$mosque->name} published its Eid-ul-Adha 2027 jamaat times: 7:00 AM, 8:30 AM (Eidgah field).",
        ]);

        // A jamaat added later is published without notifying again.
        EidJamaat::factory()->create(['mosque_id' => $mosque->id, 'jamaat_time' => '10:00', 'sequence' => 3]);
        $this->postJson("/api/admin/mosques/{$mosque->id}/eid-jamaats/publish", ['eid' => 'adha', 'year' => 2027])
            ->assertOk()
            ->assertJsonPath('published_count', 1);
        $this->assertSame(1, Notification::query()->count());

        $this->postJson("/api/admin/mosques/{$mosque->id}/eid-jamaats/publish", ['eid' => 'fitr', 'year' => 2027])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('eid');
    }

    public function test_nearby_returns_published_jamaats_sorted_by_time_then_distance(): void
    {
        $this->setSeason('adha', '2027-05-17');
        $near = Mosque::factory()->create(['latitude' => 23.7300, 'longitude' => 90.4130]);
        $far = Mosque::factory()->create(['latitude' => 23.7800, 'longitude' => 90.4100]);
        $outside = Mosque::factory()->create(['latitude' => 24.9000, 'longitude' => 91.8700]);

        $farEarly = EidJamaat::factory()->published()->create(['mosque_id' => $far->id, 'jamaat_time' => '07:00']);
        $nearEarly = EidJamaat::factory()->published()->create(['mosque_id' => $near->id, 'jamaat_time' => '07:00']);
        // The mosque is far away, but this jamaat is at a field close to the origin.
        $field = EidJamaat::factory()->published()->create([
            'mosque_id' => $outside->id,
            'jamaat_time' => '08:00',
            'location_name' => 'Paltan field',
            'latitude' => 23.7330,
            'longitude' => 90.4140,
            'women_arrangement' => true,
        ]);
        EidJamaat::factory()->create(['mosque_id' => $near->id, 'jamaat_time' => '06:30', 'sequence' => 2]);
        EidJamaat::factory()->published()->create(['mosque_id' => $outside->id, 'jamaat_time' => '06:00', 'sequence' => 2]);
        EidJamaat::factory()->published()->create(['mosque_id' => $near->id, 'eid' => 'fitr', 'date' => '2027-03-10']);

        $response = $this->getJson('/api/eid-jamaats/nearby?'.http_build_query([...self::ORIGIN, 'radius' => 10]))
            ->assertOk()
            ->assertJsonPath('season.eid', 'adha');

        $this->assertSame([$nearEarly->id, $farEarly->id, $field->id], array_column($response->json('data'), 'id'));
        $this->assertSame($near->name, $response->json('data.0.mosque.name'));
        $this->assertLessThan(1, $response->json('data.2.distance_km'));
        $this->assertSame('Paltan field', $response->json('data.2.location_name'));

        $this->getJson('/api/eid-jamaats/nearby?'.http_build_query([...self::ORIGIN, 'women' => 1]))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $field->id);

        $this->getJson('/api/eid-jamaats/nearby?'.http_build_query([...self::ORIGIN, 'eid' => 'fitr', 'year' => 2027]))
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/eid-jamaats/nearby?lat=95&lng=90')->assertUnprocessable();
    }

    public function test_season_shows_two_weeks_before_eid_and_adds_jamaats_to_mosque_profiles(): void
    {
        $mosque = Mosque::factory()->create(['latitude' => 23.73, 'longitude' => 90.41]);
        EidJamaat::factory()->published()->create(['mosque_id' => $mosque->id]);
        EidJamaat::factory()->create(['mosque_id' => $mosque->id, 'sequence' => 2]);
        $this->setSeason('adha', '2027-05-17');

        $this->travelTo('2027-05-01 12:00');
        $this->getJson('/api/eid-season')
            ->assertOk()
            ->assertJsonPath('data.label', 'Eid-ul-Adha')
            ->assertJsonPath('data.show_from', '2027-05-03')
            ->assertJsonPath('data.active', false);
        $this->getJson("/api/mosques/{$mosque->id}")->assertOk()->assertJsonPath('data.eid_jamaats', []);

        $this->travelTo('2027-05-03 12:00');
        $this->getJson('/api/eid-season')->assertOk()->assertJsonPath('data.active', true);
        $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data.eid_jamaats')
            ->assertJsonPath('data.eid_jamaats.0.eid_label', 'Eid-ul-Adha');

        $this->travelTo('2027-05-21 12:00');
        $this->getJson('/api/eid-season')->assertOk()->assertJsonPath('data.active', false);
    }

    public function test_super_admin_sets_and_clears_the_eid_season(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]));

        $this->getJson('/api/super-admin/settings')->assertOk()->assertJsonPath('data.eid_season', null);

        // The settings page sends the whole form, including an empty notice.
        $this->patchJson('/api/super-admin/settings', [
            'maintenance_notice' => '',
            'claims_enabled' => true,
            'reports_enabled' => true,
            'auto_publish_verified_mosques' => true,
            'eid_season' => ['eid' => 'fitr', 'expected_date' => '2027-03-10', 'show_from' => null],
        ])->assertOk()
            ->assertJsonPath('data.maintenance_notice', '')
            ->assertJsonPath('data.eid_season', [
                'eid' => 'fitr',
                'expected_date' => '2027-03-10',
                'show_from' => '2027-02-24',
            ]);

        $this->patchJson('/api/super-admin/settings', [
            'eid_season' => ['eid' => 'fitr', 'expected_date' => '2027-03-10', 'show_from' => '2027-03-20'],
        ])->assertUnprocessable()->assertJsonValidationErrors('eid_season.show_from');

        $this->patchJson('/api/super-admin/settings', ['eid_season' => null])
            ->assertOk()
            ->assertJsonPath('data.eid_season', null);
        $this->assertDatabaseMissing('system_settings', ['key' => 'eid_season']);
        $this->getJson('/api/eid-season')->assertOk()->assertJsonPath('data', null);
    }

    /**
     * @return array{0: User, 1: Mosque}
     */
    private function adminWithMosque(): array
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
            'latitude' => 23.7300,
            'longitude' => 90.4130,
        ]);

        return [$admin, $mosque];
    }

    private function setSeason(string $eid, string $expectedDate): void
    {
        SystemSetting::query()->create([
            'key' => 'eid_season',
            'value' => ['eid' => $eid, 'expected_date' => $expectedDate],
        ]);
    }
}
