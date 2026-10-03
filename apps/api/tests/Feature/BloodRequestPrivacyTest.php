<?php

namespace Tests\Feature;

use App\Models\BloodRequest;
use App\Models\BloodRequestResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The blood donation page used to hand every visitor the phone number of each
 * donor who offered to help, plus the requester's account number. These tests
 * pin that shut.
 */
class BloodRequestPrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_guest_sees_no_responses_and_no_creator_phone(): void
    {
        [$bloodRequest, $donor] = $this->activeRequestWithDonor();

        $response = $this->getJson("/api/blood-requests/{$bloodRequest->id}")->assertOk();

        $response->assertJsonPath('data.responses_count', 1)
            ->assertJsonMissingPath('data.responses')
            ->assertJsonMissingPath('data.creator.phone');

        $body = $response->getContent();
        $this->assertStringNotContainsString($donor->phone, $body, 'A donor phone number leaked to a guest.');
        $this->assertStringNotContainsString($bloodRequest->creator->phone, $body, 'The requester account phone number leaked to a guest.');
    }

    public function test_a_guest_still_sees_the_count_and_the_shared_contact_phone(): void
    {
        [$bloodRequest] = $this->activeRequestWithDonor();

        $this->getJson("/api/blood-requests/{$bloodRequest->id}")
            ->assertOk()
            // The requester chose to publish this number, so it stays public.
            ->assertJsonPath('data.contact_phone', $bloodRequest->contact_phone)
            ->assertJsonPath('data.responses_count', 1)
            ->assertJsonPath('data.creator.id', $bloodRequest->created_by)
            ->assertJsonPath('data.creator.name', $bloodRequest->creator->name);
    }

    public function test_the_creator_sees_every_respondents_name_and_phone(): void
    {
        [$bloodRequest, $donor] = $this->activeRequestWithDonor();
        Sanctum::actingAs($bloodRequest->creator);

        $response = $this->getJson("/api/blood-requests/{$bloodRequest->id}")->assertOk();

        $response->assertJsonCount(1, 'data.responses')
            ->assertJsonPath('data.responses.0.id', $donor->response->id)
            ->assertJsonPath('data.responses.0.respondent.name', $donor->name)
            ->assertJsonPath('data.responses.0.respondent.phone', $donor->phone);
    }

    public function test_a_super_admin_sees_the_respondents(): void
    {
        [$bloodRequest, $donor] = $this->activeRequestWithDonor();
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]));

        $this->getJson("/api/blood-requests/{$bloodRequest->id}")
            ->assertOk()
            ->assertJsonPath('data.responses.0.respondent.phone', $donor->phone);
    }

    public function test_another_logged_in_user_only_sees_the_response_count(): void
    {
        [$bloodRequest, $donor] = $this->activeRequestWithDonor();
        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson("/api/blood-requests/{$bloodRequest->id}")->assertOk();

        $response->assertJsonPath('data.responses_count', 1)->assertJsonMissingPath('data.responses');

        $this->assertStringNotContainsString($donor->phone, $response->getContent());
    }

    public function test_the_public_list_never_returns_a_phone_number(): void
    {
        [$bloodRequest, $donor] = $this->activeRequestWithDonor();
        BloodRequest::factory()->active()->create(['created_by' => User::factory()->create()]);

        $response = $this->getJson('/api/blood-requests')->assertOk();

        $response->assertJsonCount(2, 'data')->assertJsonMissingPath('data.0.responses');

        $body = $response->getContent();
        $this->assertStringNotContainsString($donor->phone, $body, 'A donor phone number leaked in the list.');
        $this->assertStringNotContainsString($bloodRequest->creator->phone, $body, 'A requester account phone number leaked in the list.');
    }

    public function test_has_responded_tells_the_viewer_whether_they_offered_to_help(): void
    {
        [$bloodRequest, $donor] = $this->activeRequestWithDonor();

        Sanctum::actingAs($donor);
        $this->getJson("/api/blood-requests/{$bloodRequest->id}")
            ->assertOk()
            ->assertJsonPath('data.has_responded', true);

        $this->getJson('/api/blood-requests')
            ->assertOk()
            ->assertJsonPath('data.0.has_responded', true);

        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/blood-requests/{$bloodRequest->id}")
            ->assertOk()
            ->assertJsonPath('data.has_responded', false);

        $this->getJson('/api/blood-requests')
            ->assertOk()
            ->assertJsonPath('data.0.has_responded', false);
    }

    public function test_has_responded_is_false_for_a_guest(): void
    {
        [$bloodRequest] = $this->activeRequestWithDonor();

        $this->getJson("/api/blood-requests/{$bloodRequest->id}")
            ->assertOk()
            ->assertJsonPath('data.has_responded', false);
    }

    /**
     * An active request with one donor who responded, and that donor's
     * response record.
     *
     * @return array{0: BloodRequest, 1: User&object{response: BloodRequestResponse}}
     */
    private function activeRequestWithDonor(): array
    {
        $creator = User::factory()->create();
        $bloodRequest = BloodRequest::factory()->active()->create([
            'created_by' => $creator->id,
            'contact_phone' => '+8801711222333',
        ]);

        $donor = User::factory()->create();
        $response = BloodRequestResponse::factory()->create([
            'blood_request_id' => $bloodRequest->id,
            'user_id' => $donor->id,
        ]);

        $donor->setAttribute('response', $response);

        return [$bloodRequest->fresh('creator'), $donor];
    }
}