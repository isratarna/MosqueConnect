<?php

use App\Http\Controllers\Admin\EventManagementController;
use App\Http\Controllers\Admin\MosqueManagementController;
use App\Http\Controllers\Admin\SystemAdminController;
use App\Http\Controllers\Auth\PhoneOtpController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\MosqueController;
use App\Http\Controllers\MosqueFollowController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
    ]);
});

Route::prefix('auth')->group(function () {
    Route::post('/send-otp', [PhoneOtpController::class, 'sendOtp'])
        ->middleware('throttle:otp-send');

    Route::post('/verify-otp', [PhoneOtpController::class, 'verifyOtp'])
        ->middleware('throttle:otp-verify');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [PhoneOtpController::class, 'logout']);
        Route::get('/me', [PhoneOtpController::class, 'me']);
    });
});

Route::get('/mosques/nearby', [MosqueController::class, 'nearby']);
Route::get('/mosques/{mosque}', [MosqueController::class, 'show']);
Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{event}', [EventController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {

    // Follow / unfollow mosque
    Route::post('/mosques/{mosque}/follow', [MosqueFollowController::class, 'follow']);
    Route::delete('/mosques/{mosque}/follow', [MosqueFollowController::class, 'unfollow']);
    Route::get('/me/followed-mosques', [MosqueFollowController::class, 'followed']);

    // Mosque admin + super admin
    Route::prefix('admin')
        ->middleware('role:mosque_admin,super_admin')
        ->group(function () {
            Route::get('/mosques/{mosque}', [MosqueManagementController::class, 'show']);
            Route::patch('/mosques/{mosque}', [MosqueManagementController::class, 'update']);

            Route::scopeBindings()->group(function () {
                Route::get('/mosques/{mosque}/events', [EventManagementController::class, 'index']);
                Route::post('/mosques/{mosque}/events', [EventManagementController::class, 'store']);
                Route::get('/mosques/{mosque}/events/{event}', [EventManagementController::class, 'show']);
                Route::patch('/mosques/{mosque}/events/{event}', [EventManagementController::class, 'update']);
                Route::delete('/mosques/{mosque}/events/{event}', [EventManagementController::class, 'destroy']);
            });
        });

    // Super admin only
    Route::prefix('super-admin')
        ->middleware('role:super_admin')
        ->group(function () {
            Route::get('/overview', [SystemAdminController::class, 'overview']);
            Route::get('/mosques/{mosque}', [MosqueManagementController::class, 'show']);
        });
});
