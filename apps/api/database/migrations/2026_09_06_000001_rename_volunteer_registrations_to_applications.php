<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('volunteer_registrations')) {
            return;
        }

        Schema::dropIfExists('volunteer_applications');

        Schema::create('volunteer_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('volunteer_opportunity_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['pending', 'accepted', 'rejected', 'cancelled'])->default('pending')->index();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->unique(['volunteer_opportunity_id', 'user_id'], 'volunteer_application_unique');
        });

        $existingRows = DB::table('volunteer_registrations')->get();

        foreach ($existingRows as $row) {
            DB::table('volunteer_applications')->insert([
                'id' => $row->id,
                'volunteer_opportunity_id' => $row->volunteer_opportunity_id,
                'user_id' => $row->user_id,
                'status' => 'accepted',
                'reviewed_by' => null,
                'reviewed_at' => null,
                'cancelled_at' => null,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
        }

        Schema::dropIfExists('volunteer_registrations');
    }

    public function down(): void
    {
        if (! Schema::hasTable('volunteer_applications')) {
            return;
        }

        Schema::create('volunteer_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('volunteer_opportunity_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['volunteer_opportunity_id', 'user_id'], 'volunteer_registration_unique');
        });

        $rows = DB::table('volunteer_applications')
            ->whereIn('status', ['pending', 'accepted'])
            ->get();

        foreach ($rows as $row) {
            DB::table('volunteer_registrations')->insert([
                'id' => $row->id,
                'volunteer_opportunity_id' => $row->volunteer_opportunity_id,
                'user_id' => $row->user_id,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
        }

        Schema::dropIfExists('volunteer_applications');
    }
};
