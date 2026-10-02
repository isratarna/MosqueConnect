<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mosques', function (Blueprint $table): void {
            $table->string('whatsapp')->nullable();
            $table->string('email')->nullable();
            $table->string('website_url')->nullable();
            $table->string('facebook_url')->nullable();
            $table->unsignedInteger('capacity')->nullable();
            $table->unsignedSmallInteger('established_year')->nullable();
            $table->string('khutbah_language', 50)->nullable();
            $table->text('women_facility_notes')->nullable();
            $table->text('accessibility_notes')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('mosques', function (Blueprint $table): void {
            $table->dropColumn([
                'whatsapp',
                'email',
                'website_url',
                'facebook_url',
                'capacity',
                'established_year',
                'khutbah_language',
                'women_facility_notes',
                'accessibility_notes',
            ]);
        });
    }
};
