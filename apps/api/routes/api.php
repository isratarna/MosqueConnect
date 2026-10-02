<?php

use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\BroadcastController;
use App\Http\Controllers\Admin\CampaignManagementController;
use App\Http\Controllers\Admin\ComplaintManagementController;
use App\Http\Controllers\Admin\ContactMessageManagementController;
use App\Http\Controllers\Admin\ContentModerationController;
use App\Http\Controllers\Admin\EidJamaatManagementController;
use App\Http\Controllers\Admin\EventManagementController;
use App\Http\Controllers\Admin\GoodsDonationManagementController;
use App\Http\Controllers\Admin\MosqueDashboardController;
use App\Http\Controllers\Admin\MosqueInsightsController;
use App\Http\Controllers\Admin\MosqueManagementController;
use App\Http\Controllers\Admin\MosqueSystemManagementController;
use App\Http\Controllers\Admin\MosqueTeamController;
use App\Http\Controllers\Admin\ReportManagementController;
use App\Http\Controllers\Admin\SuggestionReviewController;
use App\Http\Controllers\Admin\SuperAdminDashboardController;
use App\Http\Controllers\Admin\SuperAdminMosqueTeamController;
use App\Http\Controllers\Admin\SystemAdminController;
use App\Http\Controllers\Admin\SystemSettingController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\Admin\VerificationRequestManagementController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\Auth\PhoneOtpController;
use App\Http\Controllers\BloodRequestController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\CampaignDonationController;
use App\Http\Controllers\ComplaintController;
use App\Http\Controllers\ContactMessageController;
use App\Http\Controllers\ContentReportController;
use App\Http\Controllers\EidJamaatController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\EventRegistrationController;
use App\Http\Controllers\GoodsDonationController;
use App\Http\Controllers\LostFoundController;
use App\Http\Controllers\MosqueClaimController;
use App\Http\Controllers\MosqueController;
use App\Http\Controllers\MosqueFollowController;
use App\Http\Controllers\MosqueInviteController;
use App\Http\Controllers\MosquePhotoController;
use App\Http\Controllers\MosqueSuggestionController;
use App\Http\Controllers\MosqueTrackingController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\VerificationRequestController;
use App\Http\Controllers\VolunteerApplicationController;
use App\Http\Controllers\VolunteerOpportunityController;
use App\Http\Controllers\VolunteerRegistrationController;
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
        Route::patch('/me', [PhoneOtpController::class, 'updateProfile']);
    });
});

Route::get('/mosques/nearby', [MosqueController::class, 'nearby']);
Route::get('/eid-season', [EidJamaatController::class, 'season']);
Route::get('/settings/public', [SystemSettingController::class, 'publicIndex']);
Route::get('/eid-jamaats/nearby', [EidJamaatController::class, 'nearby']);
Route::get('/mosques/filters', [MosqueController::class, 'filters']);
Route::get('/mosques', [MosqueController::class, 'index']);
Route::get('/mosques/{mosque}/announcements', [AnnouncementController::class, 'index']);
Route::get('/mosques/{mosque}', [MosqueController::class, 'show']);
Route::get('/mosques/{mosque}/photo', [MosquePhotoController::class, 'show']);
Route::post('/mosques/{mosque}/track', [MosqueTrackingController::class, 'store'])
    ->middleware('throttle:mosque-track');
Route::get('/volunteer-opportunities', [VolunteerOpportunityController::class, 'index']);
Route::get('/volunteer-opportunities/{volunteerOpportunity}', [VolunteerOpportunityController::class, 'show']);
Route::get('/mosques/{mosque}/prayer-schedule', [MosqueController::class, 'prayerSchedule']);
Route::get('/announcements/{announcement}', [AnnouncementController::class, 'show']);
Route::get('/announcements', [AnnouncementController::class, 'feed']);
Route::get('/blood-requests', [BloodRequestController::class, 'index']);
Route::get('/blood-requests/me', [BloodRequestController::class, 'mine'])
    ->middleware(['auth:sanctum', 'active']);
Route::get('/blood-requests/{bloodRequest}', [BloodRequestController::class, 'show']);
Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{event}', [EventController::class, 'show']);
Route::get('/campaigns', [CampaignController::class, 'index']);
Route::get('/campaigns/{campaign}', [CampaignController::class, 'show']);
Route::get('/search', SearchController::class)->middleware('throttle:60,1');
Route::get('/stats/public', [StatsController::class, 'public']);
Route::post('/contact', [ContactMessageController::class, 'store'])->middleware('throttle:3,10');
Route::get('/lost-found', [LostFoundController::class, 'index']);
Route::get('/lost-found/me', [LostFoundController::class, 'mine'])->middleware(['auth:sanctum', 'active']);
Route::get('/lost-found/{item}', [LostFoundController::class, 'show']);
Route::get('/lost-found/{item}/photo', [LostFoundController::class, 'photo']);

Route::middleware(['auth:sanctum', 'active'])->group(function () {

    Route::get('/me/event-registrations', [EventRegistrationController::class, 'index']);
    Route::get('/me/volunteer-registrations', [VolunteerRegistrationController::class, 'index']);
    Route::get('/me/volunteer-applications', [VolunteerApplicationController::class, 'index']);
    Route::get('/me/volunteer-applications/{application}', [VolunteerApplicationController::class, 'show']);
    Route::patch('/me/volunteer-applications/{application}/cancel', [VolunteerApplicationController::class, 'cancel']);
    Route::post('/volunteer-opportunities/{volunteerOpportunity}/register', [VolunteerRegistrationController::class, 'store']);
    Route::post('/volunteer-opportunities/{volunteerOpportunity}/applications', [VolunteerApplicationController::class, 'store']);
    Route::delete('/volunteer-opportunities/{volunteerOpportunity}/register', [VolunteerRegistrationController::class, 'destroy']);
    Route::get('/me/donations', [CampaignDonationController::class, 'index']);
    Route::get('/me/blood-responses', [BloodRequestController::class, 'responses']);
    Route::post('/events/{event}/register', [EventRegistrationController::class, 'store']);
    Route::delete('/events/{event}/register', [EventRegistrationController::class, 'destroy']);

    // Current user's notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

    // Follow / unfollow mosque
    Route::post('/mosques/{mosque}/follow', [MosqueFollowController::class, 'follow']);
    Route::delete('/mosques/{mosque}/follow', [MosqueFollowController::class, 'unfollow']);
    Route::get('/me/followed-mosques', [MosqueFollowController::class, 'followed']);

    // Invitations to join a mosque's team
    Route::get('/me/mosque-invites', [MosqueInviteController::class, 'index']);
    Route::post('/me/mosque-invites/{invite}/accept', [MosqueInviteController::class, 'accept']);
    Route::post('/me/mosque-invites/{invite}/decline', [MosqueInviteController::class, 'decline']);

    // Community-suggested corrections to mosque details and prayer times
    Route::post('/mosques/{mosque}/suggestions', [MosqueSuggestionController::class, 'store'])
        ->middleware('throttle:suggestions');
    Route::get('/me/suggestions', [MosqueSuggestionController::class, 'mine']);

    // Mosque admin applicant claims: submit a claim and track its status
    Route::post('/mosque-claims', [MosqueClaimController::class, 'store']);
    Route::get('/me/mosque-claims', [MosqueClaimController::class, 'index']);
    Route::get('/me/mosque-claims/{claim}', [MosqueClaimController::class, 'show']);

    // Manual donation pledges; mosque admins confirm them before totals change.
    Route::post('/campaigns/{campaign}/donations', [CampaignDonationController::class, 'store']);
    Route::post('/reports', [ContentReportController::class, 'store']);

    // Community lost & found
    Route::post('/lost-found', [LostFoundController::class, 'store']);
    Route::patch('/lost-found/{item}', [LostFoundController::class, 'update']);
    Route::patch('/lost-found/{item}/status', [LostFoundController::class, 'updateStatus']);

    // Private feedback to a mosque
    Route::post('/mosques/{mosque}/complaints', [ComplaintController::class, 'store']);
    Route::get('/me/complaints', [ComplaintController::class, 'mine']);

    // Goods donation pledges
    Route::post('/mosques/{mosque}/goods-donations', [GoodsDonationController::class, 'store']);
    Route::get('/me/goods-donations', [GoodsDonationController::class, 'mine']);

    // Mosque admin onboarding & verification
    Route::post('/verification-requests', [VerificationRequestController::class, 'store']);
    Route::get('/verification-requests/me', [VerificationRequestController::class, 'me']);
    Route::get('/verification-requests/{verificationRequest}', [VerificationRequestController::class, 'show']);

    // Community blood requests
    Route::post('/blood-requests', [BloodRequestController::class, 'store']);
    Route::post('/blood-requests/{bloodRequest}/responses', [BloodRequestController::class, 'storeResponse']);
    Route::patch('/blood-requests/{bloodRequest}/status', [BloodRequestController::class, 'updateStatus']);

    // Mosque admin + super admin
    Route::prefix('admin')
        ->middleware('role:mosque_admin,super_admin')
        ->group(function () {
            Route::get('/mosques/{mosque}', [MosqueManagementController::class, 'show']);
            Route::patch('/mosques/{mosque}', [MosqueManagementController::class, 'update']);
            Route::get('/mosques/{mosque}/dashboard', [MosqueDashboardController::class, 'show']);
            Route::get('/mosques/{mosque}/insights', [MosqueInsightsController::class, 'show']);
            Route::post('/mosques/{mosque}/photo', [MosquePhotoController::class, 'store']);
            Route::delete('/mosques/{mosque}/photo', [MosquePhotoController::class, 'destroy']);
            Route::get('/mosques/{mosque}/prayer-schedule', [MosqueManagementController::class, 'prayerSchedule']);
            Route::put('/mosques/{mosque}/prayer-schedule', [MosqueManagementController::class, 'updatePrayerSchedule']);

            Route::get('/mosques/{mosque}/members', [MosqueTeamController::class, 'index']);
            Route::post('/mosques/{mosque}/members', [MosqueTeamController::class, 'store']);
            Route::post('/mosques/{mosque}/leave', [MosqueTeamController::class, 'leave']);

            Route::get('/mosques/{mosque}/suggestions', [SuggestionReviewController::class, 'mosqueIndex']);
            Route::patch('/mosques/{mosque}/suggestions/{suggestion}/accept', [SuggestionReviewController::class, 'mosqueAccept']);
            Route::patch('/mosques/{mosque}/suggestions/{suggestion}/reject', [SuggestionReviewController::class, 'mosqueReject']);

            Route::get('/mosques/{mosque}/lost-found', [LostFoundController::class, 'adminIndex']);

            Route::scopeBindings()->group(function () {
                Route::get('/mosques/{mosque}/complaints', [ComplaintManagementController::class, 'index']);
                Route::patch('/mosques/{mosque}/complaints/{complaint}', [ComplaintManagementController::class, 'update']);

                Route::get('/mosques/{mosque}/goods-donations', [GoodsDonationManagementController::class, 'index']);
                Route::patch('/mosques/{mosque}/goods-donations/{goodsDonation}', [GoodsDonationManagementController::class, 'update']);

                Route::patch('/mosques/{mosque}/members/{member}', [MosqueTeamController::class, 'update']);
                Route::delete('/mosques/{mosque}/members/{member}', [MosqueTeamController::class, 'destroy']);

                Route::get('/mosques/{mosque}/volunteer-opportunities', [VolunteerOpportunityController::class, 'adminIndex']);
                Route::post('/mosques/{mosque}/volunteer-opportunities', [VolunteerOpportunityController::class, 'store']);
                Route::get('/mosques/{mosque}/volunteer-opportunities/{volunteerOpportunity}', [VolunteerOpportunityController::class, 'adminShow']);
                Route::patch('/mosques/{mosque}/volunteer-opportunities/{volunteerOpportunity}', [VolunteerOpportunityController::class, 'update']);
                Route::patch('/mosques/{mosque}/volunteer-opportunities/{volunteerOpportunity}/status', [VolunteerOpportunityController::class, 'updateStatus']);
                Route::delete('/mosques/{mosque}/volunteer-opportunities/{volunteerOpportunity}', [VolunteerOpportunityController::class, 'destroy']);
                Route::get('/mosques/{mosque}/volunteer-applications', [VolunteerApplicationController::class, 'listForMosque']);
                Route::get('/mosques/{mosque}/volunteer-opportunities/{volunteerOpportunity}/applications', [VolunteerApplicationController::class, 'listForOpportunity']);
                Route::patch('/mosques/{mosque}/volunteer-opportunities/{volunteerOpportunity}/applications/{application}/accept', [VolunteerApplicationController::class, 'accept']);
                Route::patch('/mosques/{mosque}/volunteer-opportunities/{volunteerOpportunity}/applications/{application}/reject', [VolunteerApplicationController::class, 'reject']);

                Route::get('/mosques/{mosque}/eid-jamaats', [EidJamaatManagementController::class, 'index']);
                Route::post('/mosques/{mosque}/eid-jamaats', [EidJamaatManagementController::class, 'store']);
                Route::post('/mosques/{mosque}/eid-jamaats/publish', [EidJamaatManagementController::class, 'publish']);
                Route::patch('/mosques/{mosque}/eid-jamaats/{eidJamaat}', [EidJamaatManagementController::class, 'update']);
                Route::delete('/mosques/{mosque}/eid-jamaats/{eidJamaat}', [EidJamaatManagementController::class, 'destroy']);

                Route::get('/mosques/{mosque}/announcements', [AnnouncementController::class, 'adminIndex']);
                Route::post('/mosques/{mosque}/announcements', [AnnouncementController::class, 'store']);
                Route::get('/mosques/{mosque}/announcements/{announcement}', [AnnouncementController::class, 'adminShow']);
                Route::patch('/mosques/{mosque}/announcements/{announcement}', [AnnouncementController::class, 'update']);
                Route::patch('/mosques/{mosque}/announcements/{announcement}/publish', [AnnouncementController::class, 'publish']);
                Route::patch('/mosques/{mosque}/announcements/{announcement}/unpublish', [AnnouncementController::class, 'unpublish']);
                Route::delete('/mosques/{mosque}/announcements/{announcement}', [AnnouncementController::class, 'destroy']);

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
            Route::get('/dashboard', [SuperAdminDashboardController::class, 'index']);
            Route::get('/claims', [VerificationRequestManagementController::class, 'index']);
            Route::get('/claims/{verificationRequest}', [VerificationRequestManagementController::class, 'show']);
            Route::get('/claims/{verificationRequest}/document', [VerificationRequestManagementController::class, 'document']);
            Route::patch('/claims/{verificationRequest}/approve', [VerificationRequestManagementController::class, 'approve']);
            Route::patch('/claims/{verificationRequest}/reject', [VerificationRequestManagementController::class, 'reject']);
            Route::patch('/claims/{verificationRequest}/request-information', [VerificationRequestManagementController::class, 'requestInformation']);
            Route::get('/users', [UserManagementController::class, 'index']);
            Route::get('/users/{user}', [UserManagementController::class, 'show']);
            Route::patch('/users/{user}', [UserManagementController::class, 'update']);
            Route::get('/mosques', [MosqueSystemManagementController::class, 'index']);
            Route::get('/mosques/{mosque}', [MosqueManagementController::class, 'show']);
            Route::patch('/mosques/{mosque}', [MosqueSystemManagementController::class, 'update']);
            Route::delete('/mosques/{mosque}', [MosqueSystemManagementController::class, 'destroy']);
            Route::post('/mosques/{mosque}/merge', [MosqueSystemManagementController::class, 'merge']);
            Route::patch('/mosques/{mosque}/verification', [MosqueSystemManagementController::class, 'updateStatus']);
            Route::get('/mosques/{mosque}/members', [SuperAdminMosqueTeamController::class, 'index']);
            Route::post('/mosques/{mosque}/transfer', [SuperAdminMosqueTeamController::class, 'transfer']);
            Route::delete('/mosques/{mosque}/members/{user}', [SuperAdminMosqueTeamController::class, 'revoke']);
            Route::get('/suggestions', [SuggestionReviewController::class, 'systemIndex']);
            Route::patch('/suggestions/{suggestion}/accept', [SuggestionReviewController::class, 'systemAccept']);
            Route::patch('/suggestions/{suggestion}/reject', [SuggestionReviewController::class, 'systemReject']);
            Route::get('/moderation', [ContentModerationController::class, 'index']);
            Route::patch('/moderation/{type}/{id}', [ContentModerationController::class, 'update']);
            Route::get('/reports', [ReportManagementController::class, 'index']);
            Route::patch('/reports/{contentReport}', [ReportManagementController::class, 'update']);
            Route::get('/audit-logs', [AuditLogController::class, 'index']);
            Route::get('/audit-logs/actions', [AuditLogController::class, 'actions']);
            Route::get('/audit-logs/export', [AuditLogController::class, 'export']);
            Route::get('/broadcasts', [BroadcastController::class, 'index']);
            Route::post('/broadcasts', [BroadcastController::class, 'store']);
            Route::get('/contact-messages', [ContactMessageManagementController::class, 'index']);
            Route::patch('/contact-messages/{message}', [ContactMessageManagementController::class, 'update']);
            Route::get('/settings', [SystemSettingController::class, 'index']);
            Route::patch('/settings', [SystemSettingController::class, 'update']);
        });
});
