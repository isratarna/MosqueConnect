<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Queries\StatisticsService;
use Illuminate\Http\JsonResponse;

class SystemAdminController extends Controller
{
    public function __construct(private readonly StatisticsService $statistics) {}

    public function overview(): JsonResponse
    {
        return response()->json($this->statistics->overview());
    }

    public function statistics(): JsonResponse
    {
        return response()->json([
            'data' => $this->statistics->statistics(),
        ]);
    }
}
