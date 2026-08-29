<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('account_status', ['active', 'suspended'])
                ->default('active')
                ->index()
                ->after('role');
            $table->timestamp('suspended_at')->nullable()->after('account_status');
            $table->text('suspension_reason')->nullable()->after('suspended_at');
        });

        foreach (['announcements', 'events', 'campaigns'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->enum('moderation_status', ['pending', 'approved', 'rejected'])
                    ->default('approved')
                    ->index();
                $table->text('moderation_note')->nullable();
            });
        }

        Schema::create('content_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('reportable_type', ['announcement', 'event', 'campaign', 'mosque']);
            $table->unsignedBigInteger('reportable_id');
            $table->enum('category', ['inaccurate', 'inappropriate', 'fraud', 'safety', 'spam', 'other']);
            $table->string('reason', 255);
            $table->text('details')->nullable();
            $table->enum('status', ['pending', 'reviewing', 'resolved', 'dismissed'])
                ->default('pending')
                ->index();
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('resolution_note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['reportable_type', 'reportable_id']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('admin_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 100)->index();
            $table->string('target_type', 100)->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['target_type', 'target_id']);
        });

        Schema::create('system_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('admin_audit_logs');
        Schema::dropIfExists('content_reports');

        foreach (['announcements', 'events', 'campaigns'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn(['moderation_status', 'moderation_note']);
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['account_status', 'suspended_at', 'suspension_reason']);
        });
    }
};
