<?php

namespace App\Http\Controllers;

use App\Services\StatisticsService;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    public function public(StatisticsService $statistics): JsonResponse
    {
        return response()->json(['data' => $statistics->publicStats()]);
    }
}
