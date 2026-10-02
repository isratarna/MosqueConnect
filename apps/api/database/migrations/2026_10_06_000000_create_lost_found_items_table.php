<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lost and found items posted by the community, optionally at a mosque.
     */
    public function up(): void
    {
        Schema::create('lost_found_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['lost', 'found']);
            $table->string('title');
            $table->text('description');
            $table->enum('category', ['phone', 'wallet', 'keys', 'bag', 'clothing', 'shoes', 'documents', 'other']);
            $table->date('occurred_on');
            $table->string('location_note')->nullable();
            $table->string('photo_path')->nullable();
            $table->string('contact_phone', 30)->nullable();
            $table->enum('status', ['open', 'returned', 'closed'])->default('open');
            $table->enum('moderation_status', ['pending', 'approved', 'rejected'])->default('approved')->index();
            $table->text('moderation_note')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['mosque_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lost_found_items');
    }
};
