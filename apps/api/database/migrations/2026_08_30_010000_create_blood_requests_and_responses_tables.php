<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blood_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('blood_group')->index();
            $table->unsignedTinyInteger('units')->nullable();
            $table->string('hospital_or_location');
            $table->date('required_date');
            $table->enum('urgency', ['low', 'normal', 'medium', 'high', 'critical'])->default('medium')->index();
            $table->string('contact_name')->nullable();
            $table->string('contact_phone');
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'completed', 'closed', 'cancelled', 'expired'])
                ->default('active')
                ->index();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'required_date']);
        });

        Schema::create('blood_request_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blood_request_id')->constrained('blood_requests')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('message')->nullable();
            $table->timestamps();

            $table->unique(['blood_request_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blood_request_responses');
        Schema::dropIfExists('blood_requests');
    }
};
