<?php

use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\CampaignManagementController;
use App\Http\Controllers\Admin\ContentModerationController;
use App\Http\Controllers\Admin\EventManagementController;
use App\Http\Controllers\Admin\MosqueManagementController;
use App\Http\Controllers\Admin\MosqueSystemManagementController;
use App\Http\Controllers\Admin\ReportManagementController;
use App\Http\Controllers\Admin\SystemAdminController;
use App\Http\Controllers\Admin\SystemSettingController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\Admin\VerificationRequestManagementController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\Auth\PhoneOtpController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\CampaignDonationController;
use App\Http\Controllers\ContentReportController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\MosqueClaimController;
use App\Http\Controllers\MosqueController;
use App\Http\Controllers\MosqueFollowController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\VerificationRequestController;
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

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::post('/logout', [PhoneOtpController::class, 'logout']);
        Route::get('/me', [PhoneOtpController::class, 'me']);
    });
});

Route::get('/mosques/nearby', [MosqueController::class, 'nearby']);
Route::get('/mosques/{mosque}', [MosqueController::class, 'show']);
Route::get('/mosques/{mosque}/prayer-schedule', [MosqueController::class, 'prayerSchedule']);
Route::get('/announcements/{announcement}', [AnnouncementController::class, 'show']);
Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{event}', [EventController::class, 'show']);
Route::get('/campaigns', [CampaignController::class, 'index']);
Route::get('/campaigns/{campaign}', [CampaignController::class, 'show']);

Route::middleware(['auth:sanctum', 'active'])->group(function () {

    // Current user's notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

    // Follow / unfollow mosque
    Route::post('/mosques/{mosque}/follow', [MosqueFollowController::class, 'follow']);
    Route::delete('/mosques/{mosque}/follow', [MosqueFollowController::class, 'unfollow']);
    Route::get('/me/followed-mosques', [MosqueFollowController::class, 'followed']);

    // Mosque admin applicant claims: submit a claim and track its status
    Route::post('/mosque-claims', [MosqueClaimController::class, 'store']);
    Route::get('/me/mosque-claims', [MosqueClaimController::class, 'index']);
    Route::get('/me/mosque-claims/{claim}', [MosqueClaimController::class, 'show']);

    // Manual donation pledges; mosque admins confirm them before totals change.
    Route::post('/campaigns/{campaign}/donations', [CampaignDonationController::class, 'store']);
    Route::post('/reports', [ContentReportController::class, 'store']);

    // Mosque admin onboarding & verification
    Route::post('/verification-requests', [VerificationRequestController::class, 'store']);
    Route::get('/verification-requests/me', [VerificationRequestController::class, 'me']);
    Route::get('/verification-requests/{verificationRequest}', [VerificationRequestController::class, 'show']);

    // Mosque admin + super admin
    Route::prefix('admin')
        ->middleware('role:mosque_admin,super_admin')
        ->group(function () {
            Route::get('/mosques/{mosque}', [MosqueManagementController::class, 'show']);
            Route::patch('/mosques/{mosque}', [MosqueManagementController::class, 'update']);
            Route::get('/mosques/{mosque}/prayer-schedule', [MosqueManagementController::class, 'prayerSchedule']);
            Route::put('/mosques/{mosque}/prayer-schedule', [MosqueManagementController::class, 'updatePrayerSchedule']);

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
            Route::get('/statistics', [SystemAdminController::class, 'statistics']);
            Route::get('/claims', [VerificationRequestManagementController::class, 'index']);
            Route::get('/claims/{verificationRequest}', [VerificationRequestManagementController::class, 'show']);
            Route::get('/claims/{verificationRequest}/document', [VerificationRequestManagementController::class, 'document']);
            Route::patch('/claims/{verificationRequest}/approve', [VerificationRequestManagementController::class, 'approve']);
            Route::patch('/claims/{verificationRequest}/reject', [VerificationRequestManagementController::class, 'reject']);
            Route::patch('/claims/{verificationRequest}/request-information', [VerificationRequestManagementController::class, 'requestInformation']);
            Route::get('/users', [UserManagementController::class, 'index']);
            Route::patch('/users/{user}', [UserManagementController::class, 'update']);
            Route::get('/mosques', [MosqueSystemManagementController::class, 'index']);
            Route::get('/mosques/{mosque}', [MosqueManagementController::class, 'show']);
            Route::patch('/mosques/{mosque}/verification', [MosqueSystemManagementController::class, 'updateStatus']);
            Route::get('/moderation', [ContentModerationController::class, 'index']);
            Route::patch('/moderation/{type}/{id}', [ContentModerationController::class, 'update']);
            Route::get('/reports', [ReportManagementController::class, 'index']);
            Route::patch('/reports/{contentReport}', [ReportManagementController::class, 'update']);
            Route::get('/audit-logs', [AuditLogController::class, 'index']);
            Route::get('/settings', [SystemSettingController::class, 'index']);
            Route::patch('/settings', [SystemSettingController::class, 'update']);
        });
});
