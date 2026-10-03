<?php

namespace Tests\Feature;

use App\Jobs\PrescreenClaimDocument;
use App\Models\Mosque;
use App\Models\User;
use App\Models\VerificationRequest;
use App\Services\ClaimReview\ClaimAssessment;
use App\Services\ClaimReview\ClaimDocumentReviewer;
use App\Services\ClaimReview\ClaimReviewException;
use App\Services\ClaimReview\ClaimReviewInput;
use App\Services\ClaimReview\GoogleDocumentAiClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClaimDocumentPrescreenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
    }

    public function test_new_claim_is_queued_for_prescreening_only_when_the_flag_is_on(): void
    {
        Queue::fake();
        $mosque = Mosque::factory()->create(['owner_id' => null]);

        config(['services.claim_ai.enabled' => false]);
        $this->submitClaim($mosque)->assertCreated();
        Queue::assertNothingPushed();

        config(['services.claim_ai.enabled' => true]);
        $response = $this->submitClaim(Mosque::factory()->create(['owner_id' => null]))->assertCreated();
        Queue::assertPushed(PrescreenClaimDocument::class, fn (PrescreenClaimDocument $job) => $job->claim->id === $response->json('data.id'));
    }

    public function test_successful_review_stores_score_and_marks_the_claim_ai_reviewed(): void
    {
        $fake = $this->fakeReviewer(fn () => $this->assessment(0.82));
        $claim = $this->claim();

        $this->runJob($claim);

        $claim->refresh();
        $this->assertSame(VerificationRequest::STATUS_AI_REVIEWED, $claim->status);
        $this->assertEquals(0.82, (float) $claim->ai_score);
        $this->assertSame(['Mentions the mosque name.'], $claim->ai_result['findings']);
        $this->assertSame(['Low confidence.'], $claim->ai_result['red_flags']);
        $this->assertSame('google_document_ai', $claim->ai_result['usage']['provider']);

        // Only names and the document go to the service, never phone numbers.
        $this->assertSame('Baitul Aman Jame Masjid', $fake->input->mosqueName);
        $this->assertSame('Abdul Karim', $fake->input->applicantName);
        $this->assertSame('application/pdf', $fake->input->mimeType);
        $this->assertStringNotContainsString($claim->user->phone, serialize($fake->input));
    }

    public function test_unreadable_document_is_flagged_but_never_decides_the_claim(): void
    {
        $this->fakeReviewer(fn () => new ClaimAssessment(0.0, 'other', false, false, [], ['Unreadable: no text could be read from the document.'], 'No readable text.'));
        $claim = $this->claim();

        $this->runJob($claim);

        $claim->refresh();
        $this->assertSame(VerificationRequest::STATUS_AI_REVIEWED, $claim->status);
        $this->assertEquals(0.0, (float) $claim->ai_score);
        $this->assertNull($claim->reviewer_id);
        $this->assertDatabaseHas('mosques', ['id' => $claim->mosque_id, 'owner_id' => null]);
    }

    public function test_server_errors_are_retried_and_then_recorded_without_changing_status(): void
    {
        $this->fakeReviewer(fn () => throw new ClaimReviewException('Google Document AI error (503): unavailable', 503));
        $claim = $this->claim();

        $job = new PrescreenClaimDocument($claim);
        $job->withFakeQueueInteractions();

        try {
            $job->handle(app(ClaimDocumentReviewer::class));
            $this->fail('A 503 should be thrown so the queue retries it.');
        } catch (ClaimReviewException $e) {
            $this->assertTrue($e->isRetryable());
        }

        $this->assertSame(VerificationRequest::STATUS_PENDING, $claim->fresh()->status);
        $this->assertNull($claim->fresh()->ai_result);

        // The queue gives up after the last try.
        $job->failed($e);

        $claim->refresh();
        $this->assertSame(VerificationRequest::STATUS_PENDING, $claim->status);
        $this->assertSame('review_failed', $claim->ai_result['error']);
        $this->assertNull($claim->ai_score);
    }

    public function test_client_errors_are_recorded_and_not_retried(): void
    {
        $this->fakeReviewer(fn () => throw new ClaimReviewException('Google Document AI error (403): permission denied', 403));
        $claim = $this->claim();

        $this->runJob($claim);

        $claim->refresh();
        $this->assertSame(VerificationRequest::STATUS_PENDING, $claim->status);
        $this->assertSame('review_failed', $claim->ai_result['error']);
        $this->assertSame(403, $claim->ai_result['status']);
    }

    public function test_a_super_admin_decision_is_never_overwritten(): void
    {
        $claim = $this->claim();

        // The super admin approves while the review is still running.
        $this->fakeReviewer(function () use ($claim) {
            $claim->update(['status' => VerificationRequest::STATUS_APPROVED, 'review_note' => 'Checked by hand.', 'reviewed_at' => now()]);

            return $this->assessment(0.1);
        });

        $this->runJob($claim);

        $claim->refresh();
        $this->assertSame(VerificationRequest::STATUS_APPROVED, $claim->status);
        $this->assertNull($claim->ai_score);
        $this->assertNull($claim->ai_result);
    }

    public function test_claim_already_under_human_review_keeps_its_status_but_gets_the_advice(): void
    {
        $this->fakeReviewer(fn () => $this->assessment(0.6));
        $claim = $this->claim(['status' => VerificationRequest::STATUS_UNDER_HUMAN_REVIEW]);

        $this->runJob($claim);

        $claim->refresh();
        $this->assertSame(VerificationRequest::STATUS_UNDER_HUMAN_REVIEW, $claim->status);
        $this->assertEquals(0.6, (float) $claim->ai_score);
    }

    public function test_missing_document_is_recorded_without_calling_the_service(): void
    {
        $fake = $this->fakeReviewer(fn () => $this->assessment(1.0));
        $claim = $this->claim(['document_path' => 'verification/missing.pdf'], withFile: false);

        $this->runJob($claim);

        $this->assertNull($fake->input);
        $this->assertSame('unsupported_document', $claim->fresh()->ai_result['error']);
        $this->assertSame(VerificationRequest::STATUS_PENDING, $claim->fresh()->status);
    }

    public function test_google_document_ai_client_sends_the_document_and_reads_the_text(): void
    {
        // Key generation needs an openssl.cnf some PHP builds lack, so start with a cached token.
        $email = 'bot@demo-project.iam.gserviceaccount.com';
        Cache::put('google-document-ai-token:'.md5($email), 'test-token', 60);

        Http::fake([
            'us-documentai.googleapis.com/*' => Http::response(['document' => [
                'text' => "Baitul Aman Jame Masjid\nCommittee resolution",
                'pages' => [['layout' => ['confidence' => 0.9]], ['layout' => ['confidence' => 0.8]]],
            ]]),
        ]);

        $client = new GoogleDocumentAiClient([
            'project_id' => 'demo-project',
            'location' => 'us',
            'processor_id' => 'abc123',
            'credentials' => json_encode(['client_email' => $email, 'private_key' => 'unused-while-cached']),
        ]);

        $result = $client->process('%PDF-1.4 fake', 'application/pdf');

        $this->assertSame("Baitul Aman Jame Masjid\nCommittee resolution", $result['text']);
        $this->assertSame(2, $result['pages']);
        $this->assertEquals(0.85, $result['confidence']);

        Http::assertSent(fn ($request) => str_contains($request->url(), 'projects/demo-project/locations/us/processors/abc123:process')
            && $request->hasHeader('Authorization', 'Bearer test-token')
            && $request['rawDocument']['mimeType'] === 'application/pdf'
            && $request['rawDocument']['content'] === base64_encode('%PDF-1.4 fake'));
    }

    public function test_google_document_ai_client_reports_rate_limits_as_retryable(): void
    {
        Cache::put('google-document-ai-token:'.md5('a@b.c'), 'test-token', 60);
        Http::fake(['*' => Http::response(['error' => ['message' => 'Quota exceeded']], 429)]);

        $client = new GoogleDocumentAiClient([
            'project_id' => 'p', 'location' => 'us', 'processor_id' => 'x',
            'credentials' => json_encode(['client_email' => 'a@b.c', 'private_key' => 'unused']),
        ]);

        try {
            $client->process('x', 'image/png');
            $this->fail('Expected an exception.');
        } catch (ClaimReviewException $e) {
            $this->assertSame(429, $e->status);
            $this->assertTrue($e->isRetryable());
            $this->assertStringContainsString('Quota exceeded', $e->getMessage());
        }

        $this->assertFalse((new ClaimReviewException('bad request', 400))->isRetryable());
    }

    public function test_an_invalid_service_account_key_fails_without_retrying(): void
    {
        $client = new GoogleDocumentAiClient([
            'project_id' => 'p', 'location' => 'us', 'processor_id' => 'x',
            'credentials' => json_encode(['client_email' => 'new@b.c', 'private_key' => 'not-a-key']),
        ]);

        try {
            $client->process('x', 'image/png');
            $this->fail('Expected an exception.');
        } catch (ClaimReviewException $e) {
            $this->assertFalse($e->isRetryable());
        }
    }

    public function test_missing_configuration_fails_without_retrying(): void
    {
        $this->expectException(ClaimReviewException::class);

        try {
            (new GoogleDocumentAiClient([]))->process('x', 'application/pdf');
        } catch (ClaimReviewException $e) {
            $this->assertFalse($e->isRetryable());

            throw $e;
        }
    }

    private function runJob(VerificationRequest $claim): void
    {
        (new PrescreenClaimDocument($claim))->withFakeQueueInteractions()->handle(app(ClaimDocumentReviewer::class));
    }

    private function fakeReviewer(callable $respond): object
    {
        $fake = new class($respond) implements ClaimDocumentReviewer
        {
            public ?ClaimReviewInput $input = null;

            public function __construct(private $respond) {}

            public function review(ClaimReviewInput $input): ClaimAssessment
            {
                $this->input = $input;

                return ($this->respond)($input);
            }
        };

        $this->app->instance(ClaimDocumentReviewer::class, $fake);

        return $fake;
    }

    private function assessment(float $score): ClaimAssessment
    {
        return new ClaimAssessment(
            score: $score,
            documentType: 'letterhead',
            mentionsMosqueName: true,
            mentionsApplicantName: true,
            findings: ['Mentions the mosque name.'],
            redFlags: ['Low confidence.'],
            summary: 'Test summary.',
            usage: ['provider' => 'google_document_ai', 'pages' => 1],
        );
    }

    private function claim(array $attributes = [], bool $withFile = true): VerificationRequest
    {
        if ($withFile) {
            Storage::disk('local')->put('verification/proof.pdf', '%PDF-1.4 proof');
        }

        $mosque = Mosque::factory()->create(['name' => 'Baitul Aman Jame Masjid', 'owner_id' => null]);
        $user = User::factory()->create(['name' => 'Abdul Karim']);

        return VerificationRequest::query()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'document_path' => 'verification/proof.pdf',
            'role_at_mosque' => 'Secretary',
            'verification_reason' => 'I am the committee secretary.',
            'status' => VerificationRequest::STATUS_PENDING,
            'submitted_at' => now(),
            ...$attributes,
        ])->load(['mosque', 'user']);
    }

    private function submitClaim(Mosque $mosque)
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_NORMAL_USER]));

        return $this->postJson('/api/mosque-claims', [
            'mosque_id' => $mosque->id,
            'document' => UploadedFile::fake()->create('proof.pdf', 100, 'application/pdf'),
            'role_at_mosque' => 'Imam',
            'verification_reason' => 'I lead prayers at this mosque and manage its schedule.',
        ]);
    }
}
