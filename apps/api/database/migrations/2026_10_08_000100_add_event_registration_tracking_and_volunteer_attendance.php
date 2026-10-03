<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_registrations', function (Blueprint $table) {
            $table->enum('status', ['registered', 'attended', 'cancelled', 'waitlisted'])->default('registered')->after('user_id');
            $table->date('occurrence_date')->nullable()->after('status');
            $table->timestamp('checked_in_at')->nullable()->after('occurrence_date');
            $table->string('ticket_code', 8)->nullable()->after('checked_in_at');
            $table->index('event_id');
        });

        Schema::table('event_registrations', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'user_id']);
            $table->unique(['event_id', 'user_id', 'occurrence_date'], 'event_registration_occurrence_unique');
            $table->unique(['event_id', 'ticket_code'], 'event_registration_ticket_unique');
        });

        Schema::table('volunteer_applications', function (Blueprint $table) {
            $table->decimal('hours', 4, 1)->nullable()->after('status');
            $table->enum('attendance_status', ['registered', 'attended', 'no_show', 'cancelled'])->default('registered')->after('hours');
            $table->text('note')->nullable()->after('attendance_status');
            $table->timestamp('checked_in_at')->nullable()->after('note');
            $table->string('certificate_code')->nullable()->unique();
        });

        DB::table('event_registrations')->whereNull('occurrence_date')->orderBy('id')->chunkById(500, function ($registrations): void {
            $eventDates = DB::table('events')->whereIn('id', $registrations->pluck('event_id')->unique())->pluck('event_date', 'id');
            foreach ($registrations as $registration) {
                DB::table('event_registrations')->where('id', $registration->id)->update(['occurrence_date' => $eventDates[$registration->event_id] ?? null]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('event_registrations', function (Blueprint $table) {
            $table->dropUnique('event_registration_ticket_unique');
            $table->dropUnique('event_registration_occurrence_unique');
            $table->dropColumn(['status', 'occurrence_date', 'checked_in_at', 'ticket_code']);
            $table->unique(['event_id', 'user_id']);
            $table->dropIndex(['event_id']);
        });

        Schema::table('volunteer_applications', function (Blueprint $table) {
            $table->dropUnique(['certificate_code']);
            $table->dropColumn(['hours', 'attendance_status', 'note', 'checked_in_at', 'certificate_code']);
        });
    }
};
