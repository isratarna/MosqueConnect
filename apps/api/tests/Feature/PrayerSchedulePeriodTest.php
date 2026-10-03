<?php

namespace Tests\Feature;

use App\Models\Follower;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\PrayerSchedulePeriod;
use App\Models\PrayerTime;
use App\Models\RamadanTiming;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PrayerSchedulePeriodTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_application_timezone_is_bangladesh_time(): void
    {
        $this->assertSame('Asia/Dhaka', config('app.timezone'));
        $this->assertSame('Asia/Dhaka', config('prayer.timezone'));
        $this->assertSame(now()->timezone->getName(), config('app.timezone'));
    }

    public function test_dates_outside_every_period_fall_back_to_the_default_schedule(): void
    {
        $mosque = $this->mosque();
        $this->publishTimes($mosque, '05:00', '05:30');

        $period = $this->period($mosque, 'Ramadan 1448', '2027-02-08', '2027-03-09', ramadan: true);
        $this->publishTimes($period, '04:30', '05:00');

        $this->getJson("/api/mosques/{$mosque->id}/prayer-schedule")
            ->assertOk()
            ->assertJsonPath('data.period', null)
            ->assertJsonPath('data.prayer_schedule.0.prayer', PrayerTime::PRAYER_FAJR)
            ->assertJsonPath('data.prayer_schedule.0.jamaat_time', '05:30');
    }

    public function test_a_period_supplies_the_times_for_the_dates_it_covers(): void
    {
        $mosque = $this->mosque();
        $this->publishTimes($mosque, '05:00', '05:30');

        $period = $this->period($mosque, 'Winter 2026', '2026-12-01', '2026-12-31');
        $this->publishTimes($period, '06:10', '06:40');

        $this->getJson("/api/mosques/{$mosque->id}/prayer-schedule?date=2026-12-10")
            ->assertOk()
            ->assertJsonPath('data.date', '2026-12-10')
            ->assertJsonPath('data.period.name', 'Winter 2026')
            ->assertJsonPath('data.period.is_ramadan', false)
            ->assertJsonPath('data.period.ends_on', '2026-12-31')
            ->assertJsonPath('data.prayer_schedule.0.jamaat_time', '06:40');

        // The day before the period starts the default schedule is still used.
        $this->getJson("/api/mosques/{$mosque->id}/prayer-schedule?date=2026-11-30")
            ->assertOk()
            ->assertJsonPath('data.period', null)
            ->assertJsonPath('data.prayer_schedule.0.jamaat_time', '05:30');
    }

    public function test_mosque_resources_report_the_period_covering_today(): void
    {
        $mosque = $this->mosque();
        $period = $this->period($mosque, 'Ramadan 1448', now()->subDay()->toDateString(), now()->addDays(20)->toDateString(), ramadan: true);
        $this->publishTimes($period, '04:20', '04:50');

        $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonPath('data.period.name', 'Ramadan 1448')
            ->assertJsonPath('data.period.is_ramadan', true)
            ->assertJsonPath('data.prayer.Fajr', '04:50');
    }

    public function test_the_search_api_resolves_each_mosques_period_without_extra_queries(): void
    {
        $withPeriod = $this->mosque('Period Mosque');
        $period = $this->period($withPeriod, 'Ramadan 1448', now()->subDay()->toDateString(), now()->addDays(20)->toDateString(), ramadan: true);
        $this->publishTimes($period, '04:20', '04:50');
        $this->mosque('Plain Mosque');

        $this->getJson('/api/mosques?per_page=50')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.period.name', 'Ramadan 1448')
            ->assertJsonPath('data.0.prayer.Fajr', '04:50')
            ->assertJsonPath('data.1.period', null);
    }

    public function test_an_admin_can_create_a_period_and_its_prayer_times(): void
    {
        [$admin, $mosque] = $this->adminMosque();
        Sanctum::actingAs($admin);

        $periodId = $this->postJson("/api/admin/mosques/{$mosque->id}/schedule-periods", [
            'name' => 'Ramadan 1448',
            'starts_on' => '2027-02-08',
            'ends_on' => '2027-03-09',
            'is_ramadan' => true,
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Ramadan 1448')
            ->assertJsonPath('data.is_ramadan', true)
            ->json('data.id');

        $this->putJson("/api/admin/mosques/{$mosque->id}/schedule-periods/{$periodId}/prayer-times", [
            'prayer_schedule' => [[
                'prayer' => PrayerTime::PRAYER_FAJR,
                'adhan_time' => '05:10',
                'jamaat_time' => '05:40',
            ]],
        ])->assertOk()
            ->assertJsonPath('data.prayer_times.0.jamaat_time', '05:40');

        $this->assertDatabaseHas('prayer_times', [
            'mosque_id' => $mosque->id,
            'period_id' => $periodId,
            'prayer' => PrayerTime::PRAYER_FAJR,
        ]);

        $this->getJson("/api/admin/mosques/{$mosque->id}/schedule-periods")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.prayer_times.0.prayer', PrayerTime::PRAYER_FAJR);

        $this->getJson("/api/mosques/{$mosque->id}/prayer-schedule?date=2027-02-10")
            ->assertOk()
            ->assertJsonPath('data.period.name', 'Ramadan 1448')
            ->assertJsonPath('data.prayer_schedule.0.jamaat_time', '05:40');

        // The period never writes into the default timetable.
        $this->assertDatabaseMissing('prayer_times', [
            'mosque_id' => $mosque->id,
            'period_id' => null,
            'prayer' => PrayerTime::PRAYER_FAJR,
        ]);
    }

    public function test_overlapping_periods_for_the_same_mosque_are_rejected(): void
    {
        [$admin, $mosque] = $this->adminMosque();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/schedule-periods", [
            'name' => 'Winter 2026',
            'starts_on' => '2026-12-01',
            'ends_on' => '2026-12-31',
            'is_ramadan' => false,
        ])->assertCreated();

        $this->postJson("/api/admin/mosques/{$mosque->id}/schedule-periods", [
            'name' => 'Ramadan 1448',
            'starts_on' => '2026-12-20',
            'ends_on' => '2027-01-20',
            'is_ramadan' => true,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('starts_on');

        $this->assertSame(1, PrayerSchedulePeriod::query()->count());
    }

    public function test_periods_of_different_mosques_may_cover_the_same_days(): void
    {
        [$admin, $mosque] = $this->adminMosque();
        $otherMosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        foreach ([$mosque, $otherMosque] as $target) {
            $this->postJson("/api/admin/mosques/{$target->id}/schedule-periods", [
                'name' => 'Winter 2026',
                'starts_on' => '2026-12-01',
                'ends_on' => '2026-12-31',
                'is_ramadan' => false,
            ])->assertCreated();
        }

        // ends_on is inclusive, so the next period starts the following day.
        $this->postJson("/api/admin/mosques/{$mosque->id}/schedule-periods", [
            'name' => 'Summer 2027',
            'starts_on' => '2027-01-01',
            'ends_on' => '2027-03-31',
            'is_ramadan' => false,
        ])->assertCreated();

        $this->assertSame(3, PrayerSchedulePeriod::query()->count());
    }

    public function test_a_period_cannot_start_on_the_day_the_previous_one_ends(): void
    {
        [$admin, $mosque] = $this->adminMosque();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/schedule-periods", [
            'name' => 'Winter 2026',
            'starts_on' => '2026-12-01',
            'ends_on' => '2026-12-31',
            'is_ramadan' => false,
        ])->assertCreated();

        // The shared day would resolve to two timetables, so it is rejected.
        $this->postJson("/api/admin/mosques/{$mosque->id}/schedule-periods", [
            'name' => 'Summer 2027',
            'starts_on' => '2026-12-31',
            'ends_on' => '2027-03-31',
            'is_ramadan' => false,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('starts_on');
    }

    public function test_a_period_must_end_after_it_starts(): void
    {
        [$admin, $mosque] = $this->adminMosque();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/schedule-periods", [
            'name' => 'Backwards',
            'starts_on' => '2026-12-31',
            'ends_on' => '2026-12-01',
            'is_ramadan' => false,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('ends_on');
    }

    public function test_another_mosques_admin_cannot_touch_a_period(): void
    {
        [$owner, $mosque] = $this->adminMosque();
        [$intruder] = $this->adminMosque();
        $period = $this->period($mosque, 'Winter 2026', '2026-12-01', '2026-12-31');
        Sanctum::actingAs($intruder);

        $this->getJson("/api/admin/mosques/{$mosque->id}/schedule-periods/{$period->id}")->assertForbidden();
        $this->putJson("/api/admin/mosques/{$mosque->id}/schedule-periods/{$period->id}", [
            'name' => 'Hijacked',
        ])->assertForbidden();
        $this->deleteJson("/api/admin/mosques/{$mosque->id}/schedule-periods/{$period->id}")->assertForbidden();

        $this->assertSame('Winter 2026', $period->refresh()->name);
        $this->assertNotNull($owner);
    }

    public function test_a_period_cannot_be_reached_through_another_mosques_route(): void
    {
        [$admin, $mosque] = $this->adminMosque();
        $otherMosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $period = $this->period($mosque, 'Winter 2026', '2026-12-01', '2026-12-31');
        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/mosques/{$otherMosque->id}/schedule-periods/{$period->id}")->assertNotFound();
        $this->deleteJson("/api/admin/mosques/{$otherMosque->id}/schedule-periods/{$period->id}")->assertNotFound();

        $this->assertDatabaseHas('prayer_schedule_periods', ['id' => $period->id]);
    }

    public function test_deleting_a_period_leaves_the_default_schedule_intact(): void
    {
        [$admin, $mosque] = $this->adminMosque();
        $this->publishTimes($mosque, '05:00', '05:30');
        $period = $this->period($mosque, 'Winter 2026', '2026-12-01', '2026-12-31');
        $this->publishTimes($period, '06:10', '06:40');
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/admin/mosques/{$mosque->id}/schedule-periods/{$period->id}")->assertOk();

        $this->assertDatabaseMissing('prayer_times', ['period_id' => $period->id]);
        $this->assertDatabaseHas('prayer_times', [
            'mosque_id' => $mosque->id,
            'period_id' => null,
            'prayer' => PrayerTime::PRAYER_FAJR,
        ]);

        $this->getJson("/api/mosques/{$mosque->id}/prayer-schedule?date=2026-12-10")
            ->assertOk()
            ->assertJsonPath('data.period', null)
            ->assertJsonPath('data.prayer_schedule.0.jamaat_time', '05:30');
    }

    public function test_the_ramadan_endpoint_returns_today_and_the_whole_month(): void
    {
        $mosque = $this->mosque();
        $period = $this->period($mosque, 'Ramadan 1448', '2027-02-08', '2027-02-10', ramadan: true);
        $this->uploadRamadanTimings($period, ['2027-02-08', '2027-02-09', '2027-02-10']);

        $this->getJson("/api/mosques/{$mosque->id}/ramadan?date=2027-02-09")
            ->assertOk()
            ->assertJsonPath('data.period.name', 'Ramadan 1448')
            ->assertJsonPath('data.date', '2027-02-09')
            ->assertJsonPath('data.today.sehri_ends', '04:45')
            ->assertJsonPath('data.today.iftar', '18:05')
            ->assertJsonPath('data.today.taraweeh_time', '20:15')
            ->assertJsonCount(3, 'data.timings')
            ->assertJsonPath('data.timings.0.date', '2027-02-08')
            ->assertJsonPath('data.timings.2.date', '2027-02-10');
    }

    public function test_the_ramadan_endpoint_defaults_to_today(): void
    {
        $mosque = $this->mosque();
        $period = $this->period($mosque, 'Ramadan 1448', now()->subDay()->toDateString(), now()->addDay()->toDateString(), ramadan: true);
        $this->uploadRamadanTimings($period, [now()->toDateString()]);

        $this->getJson("/api/mosques/{$mosque->id}/ramadan")
            ->assertOk()
            ->assertJsonPath('data.date', now()->toDateString())
            ->assertJsonPath('data.today.date', now()->toDateString());
    }

    public function test_the_ramadan_endpoint_is_absent_outside_a_ramadan_period(): void
    {
        $mosque = $this->mosque();
        $this->period($mosque, 'Winter 2026', '2026-12-01', '2026-12-31');

        $this->getJson("/api/mosques/{$mosque->id}/ramadan")->assertNotFound();
    }

    public function test_ramadan_timings_must_be_uploaded_onto_a_ramadan_period_within_its_dates(): void
    {
        [$admin, $mosque] = $this->adminMosque();
        $winter = $this->period($mosque, 'Winter 2026', '2026-12-01', '2026-12-31');
        $ramadan = $this->period($mosque, 'Ramadan 1448', '2027-02-08', '2027-03-09', ramadan: true);
        Sanctum::actingAs($admin);

        $this->putJson("/api/admin/mosques/{$mosque->id}/schedule-periods/{$winter->id}/ramadan-timings", [
            'ramadan_timings' => [[
                'date' => '2026-12-10',
                'sehri_ends' => '04:50',
                'iftar' => '17:50',
            ]],
        ])->assertStatus(422);

        $this->putJson("/api/admin/mosques/{$mosque->id}/schedule-periods/{$ramadan->id}/ramadan-timings", [
            'ramadan_timings' => [[
                'date' => '2027-02-10',
                'sehri_ends' => '04:45',
                'iftar' => '18:05',
            ]],
        ])->assertOk()
            ->assertJsonCount(1, 'data.ramadan_timings')
            ->assertJsonPath('data.ramadan_timings.0.date', '2027-02-10')
            ->assertJsonPath('data.ramadan_timings.0.taraweeh_time', null);

        // Re-uploading replaces the previous table rather than duplicating it.
        $this->putJson("/api/admin/mosques/{$mosque->id}/schedule-periods/{$ramadan->id}/ramadan-timings", [
            'ramadan_timings' => [
                ['date' => '2027-02-11', 'sehri_ends' => '04:44', 'iftar' => '18:04', 'taraweeh_time' => '20:10'],
                ['date' => '2027-02-12', 'sehri_ends' => '04:43', 'iftar' => '18:03'],
            ],
        ])->assertOk()
            ->assertJsonCount(2, 'data.ramadan_timings')
            ->assertJsonPath('data.ramadan_timings.0.date', '2027-02-11');

        $this->assertSame(2, RamadanTiming::query()->where('period_id', $ramadan->id)->count());

        $this->putJson("/api/admin/mosques/{$mosque->id}/schedule-periods/{$ramadan->id}/ramadan-timings", [
            'ramadan_timings' => [[
                'date' => '2027-04-01',
                'sehri_ends' => '04:30',
                'iftar' => '18:00',
            ]],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('ramadan_timings');
    }

    public function test_duplicate_ramadan_dates_are_rejected(): void
    {
        [$admin, $mosque] = $this->adminMosque();
        $ramadan = $this->period($mosque, 'Ramadan 1448', '2027-02-08', '2027-03-09', ramadan: true);
        Sanctum::actingAs($admin);

        $this->putJson("/api/admin/mosques/{$mosque->id}/schedule-periods/{$ramadan->id}/ramadan-timings", [
            'ramadan_timings' => [
                ['date' => '2027-02-10', 'sehri_ends' => '04:45', 'iftar' => '18:05'],
                ['date' => '2027-02-10', 'sehri_ends' => '04:44', 'iftar' => '18:04'],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('ramadan_timings.0.date');
    }

    public function test_followers_are_notified_the_day_before_a_period_starts(): void
    {
        $mosque = $this->mosque('Gulshan Community Mosque');
        $follower = User::factory()->create();
        Follower::factory()->create(['mosque_id' => $mosque->id, 'user_id' => $follower->id]);

        $this->period($mosque, 'Ramadan 1448', now()->addDay()->toDateString(), now()->addDays(30)->toDateString(), ramadan: true);
        $this->period($mosque, 'Winter 2026', now()->addDays(60)->toDateString(), now()->addDays(90)->toDateString());

        $this->artisan('prayer-schedules:notify-starting-periods')->assertSuccessful();

        $this->assertSame(1, Notification::query()
            ->where('user_id', $follower->id)
            ->where('type', Notification::TYPE_PRAYER_SCHEDULE)
            ->where('title', 'New Ramadan timetable from tomorrow')
            ->count());

        // Running it again must not notify twice about the same period.
        $this->artisan('prayer-schedules:notify-starting-periods')->assertSuccessful();

        $this->assertSame(1, Notification::query()
            ->where('user_id', $follower->id)
            ->where('type', Notification::TYPE_PRAYER_SCHEDULE)
            ->count());
    }

    private function mosque(string $name = 'Test Mosque'): Mosque
    {
        return Mosque::factory()->create(['name' => $name]);
    }

    /** @return array{0: User, 1: Mosque} */
    private function adminMosque(): array
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);

        return [$admin, Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ])];
    }

    private function period(Mosque $mosque, string $name, string $startsOn, string $endsOn, bool $ramadan = false): PrayerSchedulePeriod
    {
        return PrayerSchedulePeriod::factory()->create([
            'mosque_id' => $mosque->id,
            'name' => $name,
            'starts_on' => $startsOn,
            'ends_on' => $endsOn,
            'is_ramadan' => $ramadan,
        ]);
    }

    private function publishTimes(Mosque|PrayerSchedulePeriod $owner, string $adhan, string $jamaat): void
    {
        PrayerTime::factory()->create([
            'mosque_id' => $owner instanceof Mosque ? $owner->id : $owner->mosque_id,
            'period_id' => $owner instanceof Mosque ? null : $owner->id,
            'prayer' => PrayerTime::PRAYER_FAJR,
            'adhan_time' => $adhan,
            'jamaat_time' => $jamaat,
        ]);
    }

    /**
     * @param  list<string>  $dates
     */
    private function uploadRamadanTimings(PrayerSchedulePeriod $period, array $dates): void
    {
        foreach ($dates as $date) {
            RamadanTiming::factory()->create([
                'period_id' => $period->id,
                'date' => $date,
                'sehri_ends' => '04:45:00',
                'iftar' => '18:05:00',
                'taraweeh_time' => '20:15:00',
            ]);
        }
    }
}
