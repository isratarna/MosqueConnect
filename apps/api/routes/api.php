<?php

use App\Http\Controllers\Admin\CampaignManagementController;
use App\Http\Controllers\Admin\EventManagementController;
use App\Http\Controllers\Admin\MosqueManagementController;
use App\Http\Controllers\Admin\SystemAdminController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\Auth\PhoneOtpController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\CampaignDonationController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\MosqueController;
use App\Http\Controllers\MosqueFollowController;
use App\Http\Controllers\NotificationController;
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
Route::get('/announcements/{announcement}', [AnnouncementController::class, 'show']);
Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{event}', [EventController::class, 'show']);
Route::get('/campaigns', [CampaignController::class, 'index']);
Route::get('/campaigns/{campaign}', [CampaignController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {

    // Current user's notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

    // Follow / unfollow mosque
    Route::post('/mosques/{mosque}/follow', [MosqueFollowController::class, 'follow']);
    Route::delete('/mosques/{mosque}/follow', [MosqueFollowController::class, 'unfollow']);
    Route::get('/me/followed-mosques', [MosqueFollowController::class, 'followed']);

    // Manual donation pledges; mosque admins confirm them before totals change.
    Route::post('/campaigns/{campaign}/donations', [CampaignDonationController::class, 'store']);

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
                Route::patch('/mosques/{mosque}/events/{event}/publish', [EventManagementController::class, 'publish']);
                Route::patch('/mosques/{mosque}/events/{event}/cancel', [EventManagementController::class, 'cancel']);
                Route::delete('/mosques/{mosque}/events/{event}', [EventManagementController::class, 'destroy']);

                Route::get('/mosques/{mosque}/campaigns', [CampaignManagementController::class, 'index']);
                Route::post('/mosques/{mosque}/campaigns', [CampaignManagementController::class, 'store']);
                Route::get('/mosques/{mosque}/campaigns/{campaign}', [CampaignManagementController::class, 'show']);
                Route::patch('/mosques/{mosque}/campaigns/{campaign}', [CampaignManagementController::class, 'update']);
                Route::patch('/mosques/{mosque}/campaigns/{campaign}/activate', [CampaignManagementController::class, 'activate']);
                Route::patch('/mosques/{mosque}/campaigns/{campaign}/complete', [CampaignManagementController::class, 'complete']);
                Route::patch('/mosques/{mosque}/campaigns/{campaign}/cancel', [CampaignManagementController::class, 'cancel']);
                Route::patch('/mosques/{mosque}/campaigns/{campaign}/expire', [CampaignManagementController::class, 'expire']);
                Route::delete('/mosques/{mosque}/campaigns/{campaign}', [CampaignManagementController::class, 'destroy']);
                Route::get('/mosques/{mosque}/campaigns/{campaign}/donations', [CampaignManagementController::class, 'donationIndex']);
                Route::post('/mosques/{mosque}/campaigns/{campaign}/donations', [CampaignManagementController::class, 'recordDonation']);
                Route::patch('/mosques/{mosque}/campaigns/{campaign}/donations/{donation}/confirm', [CampaignManagementController::class, 'confirmDonation']);
                Route::patch('/mosques/{mosque}/campaigns/{campaign}/donations/{donation}/reject', [CampaignManagementController::class, 'rejectDonation']);
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
