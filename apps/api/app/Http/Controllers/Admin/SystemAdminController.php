<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class SystemAdminController extends Controller
{
    public function overview(): JsonResponse
    {
        return response()->json([
            'users_count' => User::count(),
            'mosques_count' => Mosque::count(),
        ]);
    }
}
