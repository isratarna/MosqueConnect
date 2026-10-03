<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Mosque;
use App\Models\VolunteerOpportunity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicFeedPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_announcement_list_paginates_with_meta_and_navigation_links(): void
    {
        $mosque = Mosque::factory()->create();
        $this->announcements($mosque, 25);

        $this->getJson('/api/announcements?per_page=10')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.total', 25)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonPath('links.next', url('/api/announcements?per_page=10&page=2'))
            ->assertJsonPath('meta.from', 1)
            ->assertJsonPath('meta.to', 10);

        $this->getJson('/api/announcements?per_page=10&page=3')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta.current_page', 3)
            ->assertJsonPath('links.prev', url('/api/announcements?per_page=10&page=2'))
            ->assertJsonPath('meta.to', 25);
    }

    public function test_the_announcement_list_defaults_to_fifteen_and_caps_at_fifty(): void
    {
        $mosque = Mosque::factory()->create();
        $this->announcements($mosque, 15);

        $this->getJson('/api/announcements')
            ->assertOk()
            ->assertJsonCount(15, 'data')
            ->assertJsonPath('meta.per_page', 15);

        $this->getJson('/api/announcements?per_page=500')->assertUnprocessable()
            ->assertJsonValidationErrors('per_page');
        $this->getJson('/api/announcements?per_page=0')->assertUnprocessable()
            ->assertJsonValidationErrors('per_page');
    }

    public function test_the_announcement_list_can_be_filtered(): void
    {
        $dhanmondi = Mosque::factory()->create(['district' => 'Dhaka', 'area' => 'Dhanmondi']);
        $uttara = Mosque::factory()->create(['district' => 'Dhaka', 'area' => 'Uttara']);

        $janazah = $this->announcement($dhanmondi, [
            'title' => 'Janazah for Hafez Rahman',
            'urgency' => Announcement::URGENCY_HIGH,
            'category' => Announcement::CATEGORY_JANAZAH,
            'published_at' => now()->subDays(2),
        ]);
        $eid = $this->announcement($uttara, [
            'title' => 'Eid congregation',
            'urgency' => Announcement::URGENCY_MEDIUM,
            'category' => Announcement::CATEGORY_EID,
            'published_at' => now(),
        ]);
        $old = $this->announcement($dhanmondi, [
            'title' => 'Ramadan timetable',
            'urgency' => Announcement::URGENCY_LOW,
            'category' => Announcement::CATEGORY_RAMADAN,
            'published_at' => now()->subDays(40),
        ]);

        $this->getJson('/api/announcements?category=janazah')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $janazah->id);

        $this->getJson('/api/announcements?urgency=high')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $janazah->id);

        $this->getJson('/api/announcements?district=Dhaka&area=Dhanmondi')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissing(['id' => $eid->id]);

        $this->getJson('/api/announcements?since='.now()->subDay()->toDateString())
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $eid->id);

        $this->getJson('/api/announcements?search=Hafez')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $janazah->id);

        $this->getJson('/api/announcements?mosque_id='.$dhanmondi->id)
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissing(['id' => $eid->id]);

        $this->assertNotNull($old->id);
    }

    public function test_an_unknown_announcement_filter_value_is_rejected(): void
    {
        $this->getJson('/api/announcements?category=lunar')->assertUnprocessable()
            ->assertJsonValidationErrors('category');
        $this->getJson('/api/announcements?urgency=extreme')->assertUnprocessable()
            ->assertJsonValidationErrors('urgency');
        $this->getJson('/api/announcements?since=yesterday')->assertUnprocessable()
            ->assertJsonValidationErrors('since');
        $this->getJson('/api/announcements?mosque_id=9999')->assertUnprocessable()
            ->assertJsonValidationErrors('mosque_id');
    }

    public function test_the_per_mosque_announcement_list_keeps_its_own_default_page_size(): void
    {
        $mosque = Mosque::factory()->create();
        $this->announcements($mosque, 12);

        $this->getJson("/api/mosques/{$mosque->id}/announcements")
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.last_page', 2);
    }

    public function test_volunteer_opportunities_paginate_and_filter(): void
    {
        $dhanmondi = Mosque::factory()->create(['district' => 'Dhaka', 'area' => 'Dhanmondi']);
        $uttara = Mosque::factory()->create(['district' => 'Dhaka', 'area' => 'Uttara']);

        $cleaning = $this->opportunity($dhanmondi, [
            'title' => 'Mosque cleaning team',
            'opportunity_date' => now()->addDays(3)->toDateString(),
            'location' => 'Main hall',
        ]);
        $teaching = $this->opportunity($dhanmondi, [
            'title' => 'Quran teaching',
            'opportunity_date' => now()->addDays(9)->toDateString(),
        ]);
        $iftar = $this->opportunity($uttara, [
            'title' => 'Iftar preparation',
            'opportunity_date' => now()->addDay()->toDateString(),
        ]);

        $this->getJson('/api/volunteer-opportunities?per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.last_page', 3)
            // Soonest opportunity first.
            ->assertJsonPath('data.0.id', $iftar->id)
            ->assertJsonPath('links.next', url('/api/volunteer-opportunities?per_page=1&page=2'));

        $this->getJson('/api/volunteer-opportunities?mosque_id='.$dhanmondi->id)
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissing(['id' => $iftar->id]);

        $this->getJson('/api/volunteer-opportunities?area=Dhanmondi')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/volunteer-opportunities?search=cleaning')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $cleaning->id);

        $this->getJson('/api/volunteer-opportunities?since='.now()->addDays(5)->toDateString())
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $teaching->id);
    }

    public function test_unavailable_or_past_volunteer_opportunities_stay_out_of_the_list(): void
    {
        $mosque = Mosque::factory()->create();
        $this->opportunity($mosque, ['opportunity_date' => now()->addDays(2)->toDateString()]);
        $this->opportunity($mosque, ['opportunity_date' => now()->subDay()->toDateString()]);
        $this->opportunity($mosque, [
            'opportunity_date' => now()->addDays(5)->toDateString(),
            'status' => VolunteerOpportunity::STATUS_CLOSED,
        ]);

        $this->getJson('/api/volunteer-opportunities')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_an_unknown_volunteer_filter_value_is_rejected(): void
    {
        $this->getJson('/api/volunteer-opportunities?per_page=999')->assertUnprocessable()
            ->assertJsonValidationErrors('per_page');
        $this->getJson('/api/volunteer-opportunities?since=soon')->assertUnprocessable()
            ->assertJsonValidationErrors('since');
    }

    private function announcements(Mosque $mosque, int $count): void
    {
        foreach (range(1, $count) as $index) {
            $this->announcement($mosque, [
                'title' => "Announcement {$index}",
                'published_at' => now()->subMinutes($index),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function announcement(Mosque $mosque, array $attributes = []): Announcement
    {
        return Announcement::factory()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Announcement',
            'body' => 'Body text.',
            'status' => Announcement::STATUS_PUBLISHED,
            'moderation_status' => Announcement::MODERATION_APPROVED,
            'published_at' => now(),
            ...$attributes,
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function opportunity(Mosque $mosque, array $attributes = []): VolunteerOpportunity
    {
        return VolunteerOpportunity::factory()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Opportunity',
            'status' => VolunteerOpportunity::STATUS_ACTIVE,
            'opportunity_date' => now()->addWeek()->toDateString(),
            ...$attributes,
        ]);
    }
}
