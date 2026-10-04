<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table): void {
            $table->string('reference_hint', 255)->nullable()->after('image_url');
        });

        Schema::create('mosque_payment_methods', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['bkash', 'nagad', 'rocket', 'bank', 'other']);
            $table->string('account_name');
            $table->string('account_number');
            $table->string('bank_name')->nullable();
            $table->string('branch')->nullable();
            $table->string('routing_number')->nullable();
            $table->text('instructions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['mosque_id', 'is_active', 'sort_order']);
        });

        Schema::create('campaign_updates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('body');
            $table->decimal('amount_spent', 14, 2)->nullable();
            $table->string('image_path', 2048)->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_updates');
        Schema::dropIfExists('mosque_payment_methods');

        Schema::table('campaigns', function (Blueprint $table): void {
            $table->dropColumn('reference_hint');
        });
    }
};