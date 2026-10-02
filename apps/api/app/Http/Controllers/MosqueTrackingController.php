<?php

namespace App\Http\Controllers;

use App\Models\Mosque;
use App\Models\MosqueDailyStat;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class MosqueTrackingController extends Controller
{
    /** User agents of crawlers, link previewers and scripts, which are not counted. */
    private const BOT_PATTERN = '/bot|crawl|spider|slurp|scrape|preview|facebookexternalhit|headless|lighthouse|curl|wget|python|httpclient|okhttp|java\//i';

    /**
     * Count one anonymous profile view, directions tap or call tap for today.
     */
    public function store(Request $request, Mosque $mosque): Response
    {
        $validated = $request->validate([
            'event' => ['required', 'string', Rule::in(array_keys(MosqueDailyStat::TRACK_EVENTS))],
        ]);

        if (! $this->looksLikeBot((string) $request->userAgent())) {
            MosqueDailyStat::record($mosque->id, MosqueDailyStat::TRACK_EVENTS[$validated['event']]);
        }

        return response()->noContent();
    }

    private function looksLikeBot(string $userAgent): bool
    {
        return trim($userAgent) === '' || preg_match(self::BOT_PATTERN, $userAgent) === 1;
    }
}
