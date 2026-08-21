<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Event;
use App\Models\Mosque;
use App\Models\MosqueFacility;
use App\Models\PrayerTime;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MosqueProfileInformationTest extends TestCase
{
    use RefreshDatabase;

    public function test_mosque_details_include_prayer_jumuah_announcements_and_facilities(): void
    {
        $mosque = Mosque::factory()->create([
            'name' => 'Gulshan Society Mosque',
            'address' => 'Gulshan Avenue, Dhaka, Bangladesh',
        ]);

        $this->seedCompleteProfile($mosque);

        Event::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Weekend Quran class for children',
            'event_date' => '2026-08-29',
            'start_time' => '16:30',
            'location' => 'Classroom 2, Gulshan Society Mosque',
        ]);
        Event::factory()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Unpublished draft class',
            'status' => Event::STATUS_DRAFT,
        ]);

        $response = $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $mosque->id)
            ->assertJsonPath('data.prayer.Fajr', '04:50')
            ->assertJsonPath('data.prayer.Dhuhr', '13:30')
            ->assertJsonPath('data.prayer.Maghrib', '18:33')
            ->assertJsonPath('data.facilities.0', MosqueFacility::AC)
            ->assertJsonPath('data.jumuah_sessions.0.label', 'First Jumuah')
            ->assertJsonPath('data.jumuah_sessions.0.jamaat_time', '13:20')
            ->assertJsonPath('data.jumuah_sessions.1.label', 'Second Jumuah')
            ->assertJsonPath('data.announcements.0.title', 'Jumuah parking for wheelchair users');

        $this->assertSame(
            [MosqueFacility::AC, MosqueFacility::PARKING, MosqueFacility::WOMEN_AREA, MosqueFacility::WUDU],
            $response->json('data.facilities'),
        );
        $this->assertCount(4, $response->json('data.prayer_schedule'));
        $this->assertSame('04:22', $response->json('data.prayer_schedule.0.adhan_time'));
        $this->assertCount(2, $response->json('data.jumuah_sessions'));
        $this->assertCount(1, $response->json('data.announcements'));
    }

    public function test_mosque_details_return_empty_sections_when_profile_information_is_missing(): void
    {
        $mosque = Mosque::factory()->create([
            'name' => 'Nasirabad Jame Mosque',
            'description' => null,
            'phone' => null,
        ]);

        $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $mosque->id)
            ->assertJsonPath('data.prayer', [])
            ->assertJsonPath('data.prayer_schedule', [])
            ->assertJsonPath('data.jumuah_sessions', [])
            ->assertJsonPath('data.announcements', [])
            ->assertJsonPath('data.facilities', []);
    }

    public function test_draft_announcements_are_hidden_from_the_public_mosque_profile(): void
    {
        $mosque = Mosque::factory()->create();
        Announcement::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Published courtyard notice',
            'published_at' => now()->subDay(),
        ]);
        Announcement::factory()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Internal draft notice',
            'status' => Announcement::STATUS_DRAFT,
        ]);

        $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data.announcements')
            ->assertJsonPath('data.announcements.0.title', 'Published courtyard notice');
    }

    public function test_announcements_and_prayer_times_belong_only_to_the_requested_mosque(): void
    {
        $first = Mosque::factory()->create(['name' => 'First Mosque']);
        $second = Mosque::factory()->create(['name' => 'Second Mosque']);

        PrayerTime::factory()->create([
            'mosque_id' => $first->id,
            'prayer' => PrayerTime::PRAYER_DHUHR,
            'jamaat_time' => '13:15:00',
        ]);
        PrayerTime::factory()->create([
            'mosque_id' => $second->id,
            'prayer' => PrayerTime::PRAYER_DHUHR,
            'jamaat_time' => '13:45:00',
        ]);
        Announcement::factory()->published()->create([
            'mosque_id' => $first->id,
            'title' => 'Notice for first mosque',
        ]);
        Announcement::factory()->published()->create([
            'mosque_id' => $second->id,
            'title' => 'Notice for second mosque',
        ]);

        $this->getJson("/api/mosques/{$first->id}")
            ->assertOk()
            ->assertJsonPath('data.prayer.Dhuhr', '13:15')
            ->assertJsonCount(1, 'data.announcements')
            ->assertJsonPath('data.announcements.0.title', 'Notice for first mosque');
    }

    public function test_nearby_mosques_include_facilities_and_prayer_summary_without_announcements(): void
    {
        $mosque = Mosque::factory()->create([
            'latitude' => 23.7290000,
            'longitude' => 90.4138000,
        ]);
        $this->seedCompleteProfile($mosque);
        Announcement::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Should not appear in nearby payload',
        ]);

        $this->getJson('/api/mosques/nearby?latitude=23.7290000&longitude=90.4138000')
            ->assertOk()
            ->assertJsonPath('data.0.id', $mosque->id)
            ->assertJsonPath('data.0.prayer.Dhuhr', '13:30')
            ->assertJsonMissingPath('data.0.announcements')
            ->assertJsonMissingPath('data.0.jumuah_sessions');

        $this->assertSame(
            [MosqueFacility::AC, MosqueFacility::PARKING, MosqueFacility::WOMEN_AREA, MosqueFacility::WUDU],
            $this->getJson('/api/mosques/nearby?latitude=23.7290000&longitude=90.4138000')->json('data.0.facilities'),
        );
    }

    public function test_published_announcement_can_be_fetched_by_id(): void
    {
        $mosque = Mosque::factory()->create([
            'name' => 'Dhanmondi Eidgah Mosque',
            'phone' => '+880 2-9110000',
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $announcement = Announcement::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Janazah after Asr today',
            'body' => 'Janazah will be held immediately after Asr in the Eidgah field.',
            'urgency' => Announcement::URGENCY_HIGH,
            'published_at' => '2026-08-21 16:00:00',
        ]);

        $this->getJson("/api/announcements/{$announcement->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $announcement->id)
            ->assertJsonPath('data.title', 'Janazah after Asr today')
            ->assertJsonPath('data.urgency', Announcement::URGENCY_HIGH)
            ->assertJsonPath('data.date', '2026-08-21')
            ->assertJsonPath('data.mosque.id', $mosque->id)
            ->assertJsonPath('data.mosque.verified', true);
    }

    public function test_draft_and_missing_announcements_return_404(): void
    {
        $draft = Announcement::factory()->create([
            'status' => Announcement::STATUS_DRAFT,
        ]);

        $this->getJson("/api/announcements/{$draft->id}")->assertNotFound();
        $this->getJson('/api/announcements/999999')->assertNotFound();
    }

    public function test_public_events_for_a_mosque_remain_available_alongside_the_profile(): void
    {
        $mosque = Mosque::factory()->create();
        $other = Mosque::factory()->create();
        $matching = Event::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'created_by' => User::factory(),
            'title' => 'Heritage talk: Old Dhaka mosques',
            'event_date' => '2026-08-29',
        ]);
        Event::factory()->published()->create([
            'mosque_id' => $other->id,
            'title' => 'Different mosque programme',
        ]);

        $this->getJson("/api/mosques/{$mosque->id}")->assertOk();
        $this->getJson("/api/events?mosque_id={$mosque->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matching->id);
    }

    private function seedCompleteProfile(Mosque $mosque): void
    {
        foreach ([
            PrayerTime::PRAYER_FAJR => ['04:22:00', '04:50:00'],
            PrayerTime::PRAYER_DHUHR => ['12:05:00', '13:30:00'],
            PrayerTime::PRAYER_ASR => ['16:32:00', '16:50:00'],
            PrayerTime::PRAYER_MAGHRIB => ['18:28:00', '18:33:00'],
        ] as $prayer => [$adhan, $jamaat]) {
            PrayerTime::factory()->create([
                'mosque_id' => $mosque->id,
                'prayer' => $prayer,
                'adhan_time' => $adhan,
                'jamaat_time' => $jamaat,
            ]);
        }

        $mosque->jumuahSessions()->create([
            'sequence' => 1,
            'label' => 'First Jumuah',
            'khutbah_time' => '13:00:00',
            'jamaat_time' => '13:20:00',
            'notes' => 'Main hall',
        ]);
        $mosque->jumuahSessions()->create([
            'sequence' => 2,
            'label' => 'Second Jumuah',
            'khutbah_time' => '14:00:00',
            'jamaat_time' => '14:20:00',
            'notes' => 'For office-goers',
        ]);

        foreach ([MosqueFacility::WOMEN_AREA, MosqueFacility::WUDU, MosqueFacility::PARKING, MosqueFacility::AC] as $facility) {
            MosqueFacility::factory()->create([
                'mosque_id' => $mosque->id,
                'facility_key' => $facility,
            ]);
        }

        Announcement::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Jumuah parking for wheelchair users',
            'urgency' => Announcement::URGENCY_MEDIUM,
            'published_at' => now()->subHours(3),
        ]);
        Announcement::factory()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Unpublished committee note',
            'status' => Announcement::STATUS_DRAFT,
        ]);
    }
}
