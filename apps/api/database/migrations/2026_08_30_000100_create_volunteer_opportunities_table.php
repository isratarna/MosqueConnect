<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('volunteer_opportunities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description');
            $table->date('opportunity_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('location');
            $table->unsignedInteger('volunteers_required');
            $table->text('requirements')->nullable();
            $table->enum('status', ['active', 'closed', 'completed', 'cancelled'])->default('active')->index();
            $table->timestamps();

            $table->index(['mosque_id', 'status', 'opportunity_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('volunteer_opportunities');
    }
};
