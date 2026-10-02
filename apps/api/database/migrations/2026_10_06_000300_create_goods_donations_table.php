<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pledges of goods (food, clothes, furniture and so on) to a mosque.
     */
    public function up(): void
    {
        Schema::create('goods_donations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // Set when the pledge answers a "we need X" announcement.
            $table->foreignId('announcement_id')->nullable()->constrained()->nullOnDelete();
            $table->string('item_name');
            $table->string('quantity', 50);
            $table->enum('condition', ['new', 'gently_used', 'used']);
            $table->enum('delivery_method', ['drop_off', 'pickup', 'discuss']);
            $table->date('preferred_date')->nullable();
            $table->string('contact');
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'accepted', 'received', 'declined'])->default('pending');
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['mosque_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('goods_donations');
    }
};
