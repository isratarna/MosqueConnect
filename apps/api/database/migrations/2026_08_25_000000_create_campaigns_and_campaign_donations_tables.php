<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('title');
            $table->string('summary', 500);
            $table->text('description');
            $table->enum('category', [
                'Mosque Development',
                'Emergency Relief',
                'Education',
                'Food & Essentials',
                'Healthcare',
                'Orphan Support',
                'Community Welfare',
                'Other',
            ]);
            $table->decimal('target_amount', 14, 2);
            $table->decimal('raised_amount', 14, 2)->default(0);
            $table->char('currency', 3)->default('BDT');
            $table->date('starts_on');
            $table->date('ends_on');
            $table->string('image_url', 2048)->nullable();
            $table->enum('status', ['draft', 'active', 'completed', 'cancelled', 'expired'])->default('draft');
            $table->timestamps();

            $table->index(['status', 'starts_on', 'ends_on']);
            $table->index(['mosque_id', 'status']);
            $table->index('category');
        });

        Schema::create('campaign_donations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('donor_name')->nullable();
            $table->string('contact')->nullable();
            $table->decimal('amount', 14, 2);
            $table->enum('payment_method', ['cash', 'bank_transfer', 'mobile_banking', 'other']);
            $table->string('reference', 255)->nullable();
            $table->text('message')->nullable();
            $table->boolean('is_anonymous')->default(false);
            $table->enum('status', ['pending', 'confirmed', 'rejected'])->default('pending');
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'status']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_donations');
        Schema::dropIfExists('campaigns');
    }
};
