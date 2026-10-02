<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('mosques', function (Blueprint $table) {
            $table->string('district', 100)->nullable()->after('address')->index();
            $table->string('area', 100)->nullable()->after('district');
            $table->string('photo_path')->nullable()->after('description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mosques', function (Blueprint $table) {
            $table->dropIndex(['district']);
            $table->dropColumn(['district', 'area', 'photo_path']);
        });
    }
};
