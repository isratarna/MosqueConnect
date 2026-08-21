<?php

namespace App\Http\Controllers;

use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;

class AnnouncementController extends Controller
{
    public function show(Announcement $announcement): AnnouncementResource
    {
        abort_unless($announcement->status === Announcement::STATUS_PUBLISHED, 404);

        return new AnnouncementResource($announcement->load('mosque'));
    }
}
