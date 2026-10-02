<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\MosqueDashboardResource;
use App\Models\Mosque;
use App\Services\DashboardQueryService as DashboardCardsQueryService;
use App\Services\Queries\DashboardQueryService;
use Illuminate\Support\Facades\Gate;
use Throwable;

class MosqueDashboardController extends Controller
{
    public function __construct(
        private readonly DashboardCardsQueryService $cards,
        private readonly DashboardQueryService $queries,
    ) {}

    public function show(Mosque $mosque): MosqueDashboardResource
    {
        Gate::authorize('view', $mosque);

        // Team members whose role doesn't cover content (prayer-times only)
        // get the dashboard without content, pledge and report data.
        $canContent = Gate::allows('manageContent', $mosque);

        $mosque->followers_count = $this->queries->followersCount($mosque);
        $mosque->active_announcements_count = $this->queries->activeAnnouncementsCount($mosque);
        $mosque->upcoming_events_count = $this->queries->upcomingEventsCount($mosque);
        $mosque->active_campaigns_count = $this->queries->activeCampaignsCount($mosque);
        $mosque->pending_content_reports_count = $canContent ? $this->queries->pendingReportsCount($mosque) : 0;
        $mosque->recent_content = $canContent ? $this->queries->recentContent($mosque) : [];
        $mosque->pending_content_reports = $canContent ? $this->queries->pendingReports($mosque) : [];

        // Each card's data is loaded on its own, so one failing query leaves the
        // rest of the dashboard working. Failed sections are null and listed.
        $failed = [];
        $section = function (string $key, callable $load) use (&$failed) {
            try {
                return $load();
            } catch (Throwable $exception) {
                report($exception);
                $failed[] = $key;

                return null;
            }
        };

        $mosque->pending_pledges_count = $canContent ? $section('pending_pledges', fn (): int => $this->cards->pendingPledgesCount($mosque)) : 0;
        $mosque->today_prayers = $section('today_prayers', fn (): array => $this->cards->todayPrayers($mosque));
        $mosque->upcoming_events = $canContent ? $section('upcoming_events', fn (): array => $this->cards->upcomingEvents($mosque)) : [];
        $mosque->active_campaigns = $canContent ? $section('active_campaigns', fn (): array => $this->cards->activeCampaigns($mosque)) : [];
        $mosque->pending_pledges = $canContent ? $section('pending_pledges', fn (): array => $this->cards->pendingPledges($mosque)) : [];
        $mosque->follower_growth = $section('follower_growth', fn (): array => $this->cards->followerGrowth($mosque));
        $mosque->profile_completeness = $section('profile_completeness', fn (): array => $this->cards->profileCompleteness($mosque));
        $mosque->pending_goods_donations_count = $canContent ? $section('pending_goods_donations', fn (): int => $this->cards->pendingGoodsDonationsCount($mosque)) : 0;
        $mosque->open_complaints_count = Gate::allows('update', $mosque)
            ? $section('open_complaints', fn (): int => $this->cards->openComplaintsCount($mosque))
            : 0;
        $mosque->pending_suggestions_count = Gate::allows('reviewSuggestions', $mosque)
            ? $section('pending_suggestions', fn (): int => $mosque->editSuggestions()->pending()->count())
            : 0;
        $mosque->failed_sections = array_values(array_unique($failed));

        return new MosqueDashboardResource($mosque);
    }
}
