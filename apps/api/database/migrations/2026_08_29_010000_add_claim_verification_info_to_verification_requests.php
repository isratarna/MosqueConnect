<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('verification_requests', function (Blueprint $table) {
            $table->string('role_at_mosque', 255)->nullable()->after('document_path');
            $table->text('verification_reason')->nullable()->after('role_at_mosque');
            $table->string('active_claim_key', 255)
                ->nullable()
                ->unique()
                ->after('verification_reason')
                ->comment('Distinct for open claims; NULL once a claim is finalized. Enforces one open claim per (user, mosque).');
        });
    }

    public function down(): void
    {
        Schema::table('verification_requests', function (Blueprint $table) {
            $table->dropColumn(['active_claim_key', 'role_at_mosque', 'verification_reason']);
        });
    }
};
