<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\CampaignDonation;
use App\Models\ContactMessage;
use App\Models\Event;
use App\Models\Mosque;
use App\Models\User;
use App\Models\VolunteerApplication;
use App\Models\VolunteerOpportunity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContactAndPublicStatsTest extends TestCase
{
    use RefreshDatabase;

    private function validMessage(array $overrides = []): array
    {
        return [
            'name' => 'Amina Rahman',
            'email' => 'amina@example.com',
            'subject' => 'Partnership',
            'message' => 'Assalamu alaikum, we would like to list our mosque.',
            'website' => '',
            ...$overrides,
        ];
    }

    public function test_contact_message_is_stored_and_visible_to_the_super_admin(): void
    {
        $this->postJson('/api/contact', $this->validMessage())->assertCreated();

        $this->assertDatabaseHas('contact_messages', ['email' => 'amina@example.com', 'status' => 'new']);

        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]));
        $message = ContactMessage::query()->firstOrFail();
        $this->getJson('/api/super-admin/contact-messages')->assertOk()->assertJsonPath('data.0.id', $message->id);
        $this->getJson('/api/super-admin/contact-messages?status=read')->assertOk()->assertJsonCount(0, 'data');

        $this->patchJson("/api/super-admin/contact-messages/{$message->id}", ['status' => 'read'])
            ->assertOk()->assertJsonPath('data.status', 'read');
        $this->patchJson("/api/super-admin/contact-messages/{$message->id}", ['status' => 'bogus'])->assertUnprocessable();
    }

    public function test_only_the_super_admin_can_read_contact_messages(): void
    {
        $this->getJson('/api/super-admin/contact-messages')->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]));
        $this->getJson('/api/super-admin/contact-messages')->assertForbidden();
    }

    public function test_contact_validation(): void
    {
        $this->postJson('/api/contact', $this->validMessage(['name' => str_repeat('a', 101), 'email' => 'not-an-email', 'message' => 'short']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'message']);

        $this->postJson('/api/contact', $this->validMessage(['message' => str_repeat('a', 3001)]))
            ->assertUnprocessable()->assertJsonValidationErrors('message');
    }

    public function test_honeypot_blocks_bots(): void
    {
        $this->postJson('/api/contact', $this->validMessage(['website' => 'http://spam.example']))
            ->assertUnprocessable()->assertJsonValidationErrors('website');

        $this->assertDatabaseCount('contact_messages', 0);
    }

    public function test_contact_form_is_throttled_to_three_per_ten_minutes(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/contact', $this->validMessage())->assertCreated();
        }

        $this->postJson('/api/contact', $this->validMessage())->assertTooManyRequests();
        $this->assertDatabaseCount('contact_messages', 3);
    }

    public function test_public_stats_return_real_numbers(): void
    {
        Mosque::factory()->count(2)->create();
        $verified = Mosque::factory()->create(['verification_status' => Mosque::VERIFICATION_VERIFIED]);
        User::factory()->count(3)->create(['role' => User::ROLE_NORMAL_USER]);
        User::factory()->create(['role' => User::ROLE_NORMAL_USER, 'account_status' => User::STATUS_SUSPENDED]);
        User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);

        $campaign = Campaign::factory()->create(['mosque_id' => $verified->id]);
        CampaignDonation::factory()->create(['campaign_id' => $campaign->id, 'amount' => 1500, 'status' => CampaignDonation::STATUS_CONFIRMED]);
        CampaignDonation::factory()->create(['campaign_id' => $campaign->id, 'amount' => 500.50, 'status' => CampaignDonation::STATUS_CONFIRMED]);
        CampaignDonation::factory()->create(['campaign_id' => $campaign->id, 'amount' => 9999, 'status' => CampaignDonation::STATUS_PENDING]);

        $opportunity = VolunteerOpportunity::factory()->create(['mosque_id' => $verified->id]);
        foreach ([VolunteerApplication::STATUS_ACCEPTED, VolunteerApplication::STATUS_PENDING, VolunteerApplication::STATUS_CANCELLED] as $status) {
            VolunteerApplication::query()->create(['volunteer_opportunity_id' => $opportunity->id, 'user_id' => User::factory()->create()->id, 'status' => $status]);
        }

        Event::factory()->create(['mosque_id' => $verified->id, 'status' => Event::STATUS_PUBLISHED, 'event_date' => today()->subWeek()]);
        Event::factory()->create(['mosque_id' => $verified->id, 'status' => Event::STATUS_PUBLISHED, 'event_date' => today()->addWeek()]);
        Event::factory()->create(['mosque_id' => $verified->id, 'status' => Event::STATUS_DRAFT, 'event_date' => today()->subWeek()]);

        $normalUsers = User::query()->where('role', User::ROLE_NORMAL_USER)->where('account_status', User::STATUS_ACTIVE)->count();

        $this->getJson('/api/stats/public')->assertOk()
            ->assertJsonStructure(['data' => ['mosques_count', 'verified_mosques_count', 'members_count', 'donations_confirmed_total', 'volunteer_signups_count', 'events_held_count']])
            ->assertJsonPath('data.mosques_count', 3)
            ->assertJsonPath('data.verified_mosques_count', 1)
            ->assertJsonPath('data.members_count', $normalUsers)
            ->assertJsonPath('data.donations_confirmed_total', 2000.5)
            ->assertJsonPath('data.volunteer_signups_count', 2)
            ->assertJsonPath('data.events_held_count', 1);
    }

    public function test_public_stats_are_cached_for_ten_minutes(): void
    {
        Mosque::factory()->create();
        $this->getJson('/api/stats/public')->assertJsonPath('data.mosques_count', 1);

        Mosque::factory()->create();
        $this->getJson('/api/stats/public')->assertJsonPath('data.mosques_count', 1);
        $this->assertTrue(Cache::has('public-stats'));

        $this->travel(11)->minutes();
        $this->getJson('/api/stats/public')->assertJsonPath('data.mosques_count', 2);
    }
}
