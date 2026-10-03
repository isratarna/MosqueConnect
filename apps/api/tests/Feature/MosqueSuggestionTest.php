<?php

namespace Tests\Feature;

use App\Models\Follower;
use App\Models\Mosque;
use App\Models\MosqueEditSuggestion;
use App\Models\MosqueMember;
use App\Models\Notification;
use App\Models\PrayerTime;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MosqueSuggestionTest extends TestCase
{
    use RefreshDatabase;

    private int $phoneSequence = 100;

    public function test_guests_cannot_suggest(): void
    {
        $mosque = $this->managedMosque()[0];

        $this->postJson("/api/mosques/{$mosque->id}/suggestions", $this->ishaSuggestion())->assertUnauthorized();
    }

    public function test_anyone_signed_in_can_suggest_a_fix_and_it_records_the_current_value(): void
    {
        [$mosque] = $this->managedMosque();
        $visitor = $this->user();

        Sanctum::actingAs($visitor);
        $this->postJson("/api/mosques/{$mosque->id}/suggestions", $this->ishaSuggestion('20:15', 'Changed last week'))
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.field', 'prayer_time')
            ->assertJsonPath('data.payload', ['prayer' => 'isha', 'jamaat_time' => '20:15'])
            ->assertJsonPath('data.before.jamaat_time', '20:00')
            ->assertJsonPath('data.before.source', 'mosque');

        $this->getJson('/api/me/suggestions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.mosque.name', $mosque->name)
            ->assertJsonPath('trusted_contributor', false);

        // Nothing changes until it is reviewed.
        $this->assertSame('20:00', $this->time($mosque, 'isha', 'jamaat_time'));
    }

    public function test_suggestions_are_validated_per_field(): void
    {
        [$mosque] = $this->managedMosque();
        Sanctum::actingAs($this->user());
        $url = "/api/mosques/{$mosque->id}/suggestions";

        $this->postJson($url, ['field' => 'opening_hours'])->assertUnprocessable()->assertJsonValidationErrors('field');
        $this->postJson($url, ['field' => 'prayer_time', 'payload' => ['prayer' => 'isha', 'jamaat_time' => '8pm']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.jamaat_time');
        $this->postJson($url, ['field' => 'prayer_time', 'payload' => ['prayer' => 'tahajjud', 'jamaat_time' => '03:00']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.prayer');
        $this->postJson($url, ['field' => 'location', 'payload' => ['latitude' => 123, 'longitude' => 90]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.latitude');
        $this->postJson($url, ['field' => 'facilities', 'payload' => ['facilities' => ['swimming_pool']]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.facilities.0');
        $this->postJson($url, ['field' => 'other'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('note');
        $this->postJson($url, ['field' => 'other', 'note' => 'The mosque was renamed last year.'])->assertCreated();
    }

    public function test_a_suggestion_that_changes_nothing_is_refused(): void
    {
        [$mosque] = $this->managedMosque();
        Sanctum::actingAs($this->user());

        $this->postJson("/api/mosques/{$mosque->id}/suggestions", $this->ishaSuggestion('20:00'))
            ->assertUnprocessable()
            ->assertJson(['message' => 'That is already what the mosque shows. Nothing would change.']);
        $this->postJson("/api/mosques/{$mosque->id}/suggestions", ['field' => 'phone', 'payload' => ['phone' => $mosque->phone]])
            ->assertUnprocessable();
    }

    public function test_suggestions_are_limited_to_ten_a_day(): void
    {
        [$mosque] = $this->managedMosque();
        Sanctum::actingAs($this->user());

        foreach (range(1, 10) as $minute) {
            $this->postJson("/api/mosques/{$mosque->id}/suggestions", $this->ishaSuggestion(sprintf('20:%02d', 10 + $minute)))->assertCreated();
        }

        $this->postJson("/api/mosques/{$mosque->id}/suggestions", $this->ishaSuggestion('20:30'))
            ->assertTooManyRequests()
            ->assertJson(['message' => 'You can suggest up to 10 corrections a day. Please try again tomorrow.']);
    }

    public function test_the_mosque_admin_accepts_a_fix_which_updates_the_mosque_and_tells_followers(): void
    {
        [$mosque, $owner] = $this->managedMosque();
        $visitor = $this->user();
        $follower = $this->user();
        Follower::query()->create(['user_id' => $follower->id, 'mosque_id' => $mosque->id]);

        Sanctum::actingAs($visitor);
        $suggestionId = $this->postJson("/api/mosques/{$mosque->id}/suggestions", $this->ishaSuggestion('20:15'))->json('data.id');

        Sanctum::actingAs($owner);
        $this->getJson("/api/admin/mosques/{$mosque->id}/suggestions")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.current.jamaat_time', '20:00')
            ->assertJsonPath('data.0.payload.jamaat_time', '20:15')
            ->assertJsonPath('data.0.can_review', true)
            ->assertJsonPath('data.0.user.name', $visitor->name);
        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")->assertJsonPath('data.summary.pending_suggestions_count', 1);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/suggestions/{$suggestionId}/accept", ['review_note' => 'Thanks!'])
            ->assertOk()
            ->assertJsonPath('data.status', 'accepted')
            ->assertJsonPath('data.reviewer.id', $owner->id);

        // The mosque's time changed, keeping the published adhan time.
        $this->assertSame('20:15', $this->time($mosque, 'isha', 'jamaat_time'));
        $this->assertSame('19:45', $this->time($mosque, 'isha', 'adhan_time'));

        // Followers hear about the new time, and the suggester about the review.
        $followerNotice = Notification::query()->where('user_id', $follower->id)->where('type', Notification::TYPE_PRAYER_SCHEDULE)->firstOrFail();
        $this->assertStringContainsString('Isha jamaat 8:15 PM', $followerNotice->message);
        $this->assertDatabaseHas('notifications', ['user_id' => $visitor->id, 'type' => Notification::TYPE_SUGGESTION, 'title' => 'Your correction was accepted']);
        $this->assertSame(1, $visitor->fresh()->accepted_suggestions_count);

        // The public profile says the times were confirmed by the community.
        $confirmedAt = $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonPath('data.prayer.Isha', '20:15')
            ->json('data.times_confirmed_by_community_at');
        $this->assertNotNull($confirmedAt);

        // A reviewed suggestion cannot be reviewed again.
        $this->patchJson("/api/admin/mosques/{$mosque->id}/suggestions/{$suggestionId}/reject")
            ->assertUnprocessable()
            ->assertJson(['message' => 'This suggestion has already been reviewed.']);
    }

    public function test_rejecting_changes_nothing_and_tells_the_suggester(): void
    {
        [$mosque, $owner] = $this->managedMosque();
        $visitor = $this->user();
        $suggestion = $this->suggest($mosque, $visitor, 'phone', ['phone' => '+880 2-9999999']);

        Sanctum::actingAs($owner);
        $this->patchJson("/api/admin/mosques/{$mosque->id}/suggestions/{$suggestion->id}/reject", ['review_note' => 'That is the old office number.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');

        $this->assertNotSame('+880 2-9999999', $mosque->fresh()->phone);
        $this->assertSame(0, $visitor->fresh()->accepted_suggestions_count);
        $notice = Notification::query()->where('user_id', $visitor->id)->where('type', Notification::TYPE_SUGGESTION)->firstOrFail();
        $this->assertStringContainsString('That is the old office number.', $notice->message);
        $this->assertNull($this->getJson("/api/mosques/{$mosque->id}")->json('data.times_confirmed_by_community_at'));
    }

    public function test_reviewer_needs_the_role_that_covers_the_field(): void
    {
        [$mosque] = $this->managedMosque();
        $visitor = $this->user();
        $timeFix = $this->suggest($mosque, $visitor, 'prayer_time', ['prayer' => 'isha', 'jamaat_time' => '20:20']);
        $phoneFix = $this->suggest($mosque, $visitor, 'phone', ['phone' => '+880 2-5555555']);

        $editor = $this->teamMember($mosque, MosqueMember::ROLE_EDITOR);
        Sanctum::actingAs($editor);
        $this->getJson("/api/admin/mosques/{$mosque->id}/suggestions")->assertForbidden();
        $this->patchJson("/api/admin/mosques/{$mosque->id}/suggestions/{$timeFix->id}/accept")->assertForbidden();

        $muazzin = $this->teamMember($mosque, MosqueMember::ROLE_PRAYER_TIMES);
        Sanctum::actingAs($muazzin);
        $list = $this->getJson("/api/admin/mosques/{$mosque->id}/suggestions")->assertOk()->json('data');
        $this->assertSame([$phoneFix->id => false, $timeFix->id => true], collect($list)->pluck('can_review', 'id')->all());
        $this->patchJson("/api/admin/mosques/{$mosque->id}/suggestions/{$phoneFix->id}/accept")->assertForbidden();
        $this->patchJson("/api/admin/mosques/{$mosque->id}/suggestions/{$timeFix->id}/accept")->assertOk();
    }

    public function test_admins_cannot_review_other_mosques_suggestions(): void
    {
        [$mosque] = $this->managedMosque();
        [$otherMosque, $otherOwner] = $this->managedMosque();
        $suggestion = $this->suggest($mosque, $this->user(), 'phone', ['phone' => '+880 2-5555555']);

        Sanctum::actingAs($otherOwner);
        $this->getJson("/api/admin/mosques/{$mosque->id}/suggestions")->assertForbidden();
        $this->patchJson("/api/admin/mosques/{$otherMosque->id}/suggestions/{$suggestion->id}/accept")->assertNotFound();
        $this->patchJson("/api/admin/mosques/{$mosque->id}/suggestions/{$suggestion->id}/accept")->assertForbidden();
    }

    public function test_super_admin_reviews_unclaimed_mosques_by_default(): void
    {
        [$managed] = $this->managedMosque();
        $unclaimed = $this->unclaimedMosque();
        $visitor = $this->user();
        $managedFix = $this->suggest($managed, $visitor, 'phone', ['phone' => '+880 2-1111111']);
        $unclaimedFix = $this->suggest($unclaimed, $visitor, 'phone', ['phone' => '+880 2-2222222']);

        Sanctum::actingAs($this->user(User::ROLE_SUPER_ADMIN));
        $this->getJson('/api/super-admin/suggestions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $unclaimedFix->id)
            ->assertJsonPath('data.0.current.phone', $unclaimed->phone)
            ->assertJsonPath('data.0.can_review', true);
        $this->getJson('/api/super-admin/suggestions?scope=all')->assertJsonCount(2, 'data');
        $this->getJson('/api/super-admin/suggestions?status=accepted')->assertJsonCount(0, 'data');

        $this->patchJson("/api/super-admin/suggestions/{$unclaimedFix->id}/accept")->assertOk();
        $this->assertSame('+880 2-2222222', $unclaimed->fresh()->phone);
        $this->assertNotSame('+880 2-1111111', $managed->fresh()->phone);
        $this->assertSame(MosqueEditSuggestion::STATUS_PENDING, $managedFix->fresh()->status);

        // Mosque admins and normal users cannot use the super-admin queue.
        Sanctum::actingAs($visitor);
        $this->getJson('/api/super-admin/suggestions')->assertForbidden();
    }

    public function test_every_field_is_applied_through_the_admin_editor(): void
    {
        $mosque = $this->unclaimedMosque();
        $visitor = $this->user();
        Sanctum::actingAs($this->user(User::ROLE_SUPER_ADMIN));

        $cases = [
            ['address', ['address' => '12 New Road, Dhaka', 'district' => 'Dhaka', 'area' => 'Motijheel']],
            ['location', ['latitude' => 23.7333, 'longitude' => 90.4170]],
            ['facilities', ['facilities' => ['wudu', 'women_area']]],
            ['jumuah', ['sequence' => 1, 'jamaat_time' => '13:30', 'khutbah_time' => '13:00']],
            ['prayer_time', ['prayer' => 'fajr', 'jamaat_time' => '05:10']],
        ];

        foreach ($cases as [$field, $payload]) {
            $suggestion = $this->suggest($mosque, $visitor, $field, $payload);
            $this->patchJson("/api/super-admin/suggestions/{$suggestion->id}/accept")->assertOk();
        }

        $mosque->refresh();
        $this->assertSame('12 New Road, Dhaka', $mosque->address);
        $this->assertSame('Motijheel', $mosque->area);
        $this->assertEqualsWithDelta(23.7333, (float) $mosque->latitude, 0.00001);
        $this->assertEqualsWithDelta(90.4170, (float) $mosque->longitude, 0.00001);
        $this->assertEqualsCanonicalizing(['wudu', 'women_area'], $mosque->facilities()->pluck('facility_key')->all());
        $jumuah = $mosque->jumuahSessions()->where('sequence', 1)->firstOrFail();
        $this->assertSame(['Jumuah', '13:30', '13:00'], [$jumuah->label, substr($jumuah->jamaat_time, 0, 5), substr($jumuah->khutbah_time, 0, 5)]);
        // An unpublished prayer gets its adhan from the calculated time.
        $fajr = PrayerTime::query()->where('mosque_id', $mosque->id)->where('prayer', 'fajr')->firstOrFail();
        $this->assertSame('05:10', substr($fajr->jamaat_time, 0, 5));
        $this->assertNotNull($fajr->adhan_time);
        $this->assertSame(5, $visitor->fresh()->accepted_suggestions_count);
    }

    public function test_an_address_fix_without_district_or_area_keeps_them(): void
    {
        $mosque = $this->unclaimedMosque();
        $mosque->forceFill(['district' => 'Dhaka', 'area' => 'Paltan'])->save();
        $suggestion = $this->suggest($mosque, $this->user(), 'address', ['address' => '5 New Road']);

        Sanctum::actingAs($this->user(User::ROLE_SUPER_ADMIN));
        $this->patchJson("/api/super-admin/suggestions/{$suggestion->id}/accept")->assertOk();

        $mosque->refresh();
        $this->assertSame(['5 New Road', 'Dhaka', 'Paltan'], [$mosque->address, $mosque->district, $mosque->area]);

        Sanctum::actingAs($this->user());
        $this->postJson("/api/mosques/{$mosque->id}/suggestions", ['field' => 'address', 'payload' => ['address' => '5 New Road']])
            ->assertUnprocessable();
    }

    public function test_other_suggestions_are_marked_accepted_without_changing_the_mosque(): void
    {
        $mosque = $this->unclaimedMosque();
        $suggestion = $this->suggest($mosque, $this->user(), 'other', [], 'The mosque has a new name sign.');
        $before = $mosque->fresh()->toArray();

        Sanctum::actingAs($this->user(User::ROLE_SUPER_ADMIN));
        $this->patchJson("/api/super-admin/suggestions/{$suggestion->id}/accept")
            ->assertOk()
            ->assertJson(['message' => 'Marked as accepted. Make the change by hand if anything needs updating.']);

        $this->assertSame($before['name'], $mosque->fresh()->name);
    }

    public function test_trusted_contributors_are_auto_accepted_for_unclaimed_mosques_only(): void
    {
        [$managed] = $this->managedMosque();
        $unclaimed = $this->unclaimedMosque();
        $trusted = $this->user();
        $trusted->forceFill(['accepted_suggestions_count' => 3])->save();

        Sanctum::actingAs($trusted);
        $this->getJson('/api/auth/me')->assertJsonPath('user.trusted_contributor', true);

        $this->postJson("/api/mosques/{$unclaimed->id}/suggestions", ['field' => 'phone', 'payload' => ['phone' => '+880 2-3333333']])
            ->assertCreated()
            ->assertJsonPath('data.status', 'accepted')
            ->assertJsonPath('data.auto_accepted', true);
        $this->assertSame('+880 2-3333333', $unclaimed->fresh()->phone);
        $this->assertSame(4, $trusted->fresh()->accepted_suggestions_count);

        $this->postJson("/api/mosques/{$managed->id}/suggestions", ['field' => 'phone', 'payload' => ['phone' => '+880 2-4444444']])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        // "Other" always needs a person to read it.
        $this->postJson("/api/mosques/{$unclaimed->id}/suggestions", ['field' => 'other', 'note' => 'Closed for renovation.'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        config(['suggestions.auto_accept_trusted' => false]);
        $this->postJson("/api/mosques/{$unclaimed->id}/suggestions", ['field' => 'phone', 'payload' => ['phone' => '+880 2-5555555']])
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_admin_editor_notifies_followers_only_when_times_change(): void
    {
        [$mosque, $owner] = $this->managedMosque();
        $follower = $this->user();
        Follower::query()->create(['user_id' => $follower->id, 'mosque_id' => $mosque->id]);
        Sanctum::actingAs($owner);

        $same = ['prayer_schedule' => [['prayer' => 'isha', 'adhan_time' => '19:45', 'jamaat_time' => '20:00']]];
        $this->putJson("/api/admin/mosques/{$mosque->id}/prayer-schedule", $same)->assertOk();
        $this->assertSame(0, Notification::query()->where('user_id', $follower->id)->count());

        $changed = ['prayer_schedule' => [['prayer' => 'isha', 'adhan_time' => '19:45', 'jamaat_time' => '20:10']]];
        $this->putJson("/api/admin/mosques/{$mosque->id}/prayer-schedule", $changed)->assertOk();
        $this->assertSame(1, Notification::query()->where('user_id', $follower->id)->where('type', Notification::TYPE_PRAYER_SCHEDULE)->count());
    }

    /**
     * A verified mosque with an owner and a published Isha time (adhan 19:45, jamaat 20:00).
     *
     * @return array{Mosque, User}
     */
    private function managedMosque(): array
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = Mosque::factory()->create([
            'owner_id' => $owner->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
            'latitude' => 23.7290000,
            'longitude' => 90.4138000,
            'phone' => '+880 2-7000000',
        ]);
        PrayerTime::query()->create(['mosque_id' => $mosque->id, 'prayer' => 'isha', 'adhan_time' => '19:45', 'jamaat_time' => '20:00']);

        return [$mosque, $owner];
    }

    private function time(Mosque $mosque, string $prayer, string $column): string
    {
        return substr((string) PrayerTime::query()->where('mosque_id', $mosque->id)->where('prayer', $prayer)->value($column), 0, 5);
    }

    private function unclaimedMosque(): Mosque
    {
        return Mosque::factory()->create([
            'owner_id' => null,
            'latitude' => 23.7330000,
            'longitude' => 90.4080000,
            'phone' => '+880 2-8000000',
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function suggest(Mosque $mosque, User $user, string $field, array $payload, ?string $note = null): MosqueEditSuggestion
    {
        return MosqueEditSuggestion::query()->create([
            'mosque_id' => $mosque->id,
            'user_id' => $user->id,
            'field' => $field,
            'payload' => $payload,
            'note' => $note,
        ])->refresh();
    }

    /**
     * @return array<string, mixed>
     */
    private function ishaSuggestion(string $time = '20:15', ?string $note = null): array
    {
        return ['field' => 'prayer_time', 'payload' => ['prayer' => 'isha', 'jamaat_time' => $time], 'note' => $note];
    }

    private function user(string $role = User::ROLE_NORMAL_USER): User
    {
        return User::factory()->create(['phone' => '+88018000'.str_pad((string) ++$this->phoneSequence, 5, '0', STR_PAD_LEFT), 'role' => $role]);
    }

    private function teamMember(Mosque $mosque, string $role): User
    {
        $user = $this->user(User::ROLE_MOSQUE_ADMIN);
        MosqueMember::query()->create(['mosque_id' => $mosque->id, 'user_id' => $user->id, 'role' => $role, 'accepted_at' => now()]);

        return $user;
    }
}
