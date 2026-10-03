<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Private feedback from a member of the community to one mosque.
     */
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('category', ['cleanliness', 'facilities', 'timing', 'safety', 'management', 'suggestion', 'other']);
            $table->string('subject');
            $table->text('body');
            $table->boolean('is_anonymous')->default(false);
            $table->enum('status', ['open', 'in_progress', 'resolved', 'dismissed'])->default('open');
            $table->text('admin_response')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->index(['mosque_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
