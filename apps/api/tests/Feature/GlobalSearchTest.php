<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\Event;
use App\Models\Mosque;
use App\Models\VolunteerOpportunity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_one_request_returns_every_group(): void
    {
        $mosque = Mosque::factory()->create(['name' => 'Baitul Noor Jame Masjid', 'area' => 'Mirpur', 'district' => 'Dhaka']);
        Event::factory()->create(['mosque_id' => $mosque->id, 'title' => 'Noor Quran night', 'status' => Event::STATUS_PUBLISHED, 'event_date' => today()->addDays(3)]);
        Campaign::factory()->create(['mosque_id' => $mosque->id, 'title' => 'Noor roof repair', 'status' => Campaign::STATUS_ACTIVE, 'starts_on' => today()->subDay(), 'ends_on' => today()->addMonth()]);
        Announcement::factory()->create(['mosque_id' => $mosque->id, 'title' => 'Noor class timing', 'status' => Announcement::STATUS_PUBLISHED, 'published_at' => now()->subDays(2)]);
        VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id, 'title' => 'Noor iftar volunteers']);

        $response = $this->getJson('/api/search?q=noor')->assertOk()
            ->assertJsonStructure(['query', 'data' => ['mosques', 'events', 'campaigns', 'announcements', 'volunteer_opportunities']]);

        foreach (['mosques', 'events', 'campaigns', 'announcements', 'volunteer_opportunities'] as $group) {
            $this->assertSame(1, $response->json("data.{$group}.total"), $group);
            $this->assertSame(['type', 'id', 'title', 'subtitle', 'url'], array_keys($response->json("data.{$group}.items.0")));
        }

        $response->assertJsonPath('data.mosques.items.0.url', "/mosque/{$mosque->id}")
            ->assertJsonPath('data.mosques.items.0.subtitle', 'Mirpur, Dhaka')
            ->assertJsonPath('data.events.items.0.type', 'event');
    }

    public function test_mosques_match_on_address_area_and_district(): void
    {
        Mosque::factory()->create(['name' => 'Alpha', 'address' => '12 Lalbagh Road']);
        Mosque::factory()->create(['name' => 'Beta', 'area' => 'Lalbagh']);
        Mosque::factory()->create(['name' => 'Gamma', 'district' => 'Sylhet']);

        $this->getJson('/api/search?q=lalbagh&types[]=mosques')->assertOk()->assertJsonPath('data.mosques.total', 2);
        $this->getJson('/api/search?q=sylhet&types[]=mosques')->assertOk()->assertJsonPath('data.mosques.total', 1);
    }

    public function test_groups_return_at_most_five_items_with_the_full_total(): void
    {
        Mosque::factory()->count(7)->sequence(fn ($s) => ['name' => "Rahmania Masjid {$s->index}"])->create();

        $this->getJson('/api/search?q=rahmania&types[]=mosques')->assertOk()
            ->assertJsonPath('data.mosques.total', 7)
            ->assertJsonCount(5, 'data.mosques.items');
    }

    public function test_only_public_content_is_returned(): void
    {
        $mosque = Mosque::factory()->create(['name' => 'Unrelated']);
        Event::factory()->create(['mosque_id' => $mosque->id, 'title' => 'Zikr draft', 'status' => Event::STATUS_DRAFT, 'event_date' => today()->addDay()]);
        Event::factory()->create(['mosque_id' => $mosque->id, 'title' => 'Zikr past', 'status' => Event::STATUS_PUBLISHED, 'event_date' => today()->subDay()]);
        Campaign::factory()->create(['mosque_id' => $mosque->id, 'title' => 'Zikr draft fund', 'status' => Campaign::STATUS_DRAFT]);
        Announcement::factory()->create(['mosque_id' => $mosque->id, 'title' => 'Zikr old', 'status' => Announcement::STATUS_PUBLISHED, 'published_at' => now()->subDays(91)]);
        Announcement::factory()->create(['mosque_id' => $mosque->id, 'title' => 'Zikr hidden', 'status' => Announcement::STATUS_PUBLISHED, 'published_at' => now(), 'moderation_status' => 'rejected']);
        VolunteerOpportunity::factory()->create(['mosque_id' => $mosque->id, 'title' => 'Zikr closed', 'status' => VolunteerOpportunity::STATUS_CLOSED]);

        $response = $this->getJson('/api/search?q=zikr')->assertOk();

        foreach (['events', 'campaigns', 'announcements', 'volunteer_opportunities'] as $group) {
            $this->assertSame(0, $response->json("data.{$group}.total"), $group);
        }
    }

    public function test_query_must_be_at_least_two_characters(): void
    {
        $this->getJson('/api/search')->assertUnprocessable()->assertJsonValidationErrors('q');
        $this->getJson('/api/search?q=a')->assertUnprocessable()->assertJsonValidationErrors('q');
        $this->getJson('/api/search?q=ab')->assertOk();
    }

    public function test_type_filter_limits_the_groups(): void
    {
        $this->getJson('/api/search?q=masjid&types[]=mosques&types[]=events')->assertOk()
            ->assertJsonStructure(['data' => ['mosques', 'events']])
            ->assertJsonMissingPath('data.campaigns')
            ->assertJsonMissingPath('data.announcements');

        $this->getJson('/api/search?q=masjid&types[]=nope')->assertUnprocessable();
    }

    public function test_search_is_throttled_to_60_requests_a_minute(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/search?q=ab')->assertOk();
        }

        $this->getJson('/api/search?q=ab')->assertTooManyRequests();
    }
}
