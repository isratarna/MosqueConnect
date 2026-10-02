<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mosques', function (Blueprint $table): void {
            $table->index('area');
            $table->decimal('rating_avg', 2, 1)->nullable();
            $table->unsignedInteger('reviews_count')->default(0);
        });

        DB::table('mosques')
            ->where(function ($query): void {
                $query->whereNull('district')->orWhereNull('area');
            })
            ->select(['id', 'address', 'district', 'area'])
            ->orderBy('id')
            ->get()
            ->each(function (object $mosque): void {
                [$district, $area] = $this->locationFromAddress($mosque->address);
                $updates = [];
                if ($mosque->district === null) {
                    $updates['district'] = $district;
                }
                if ($mosque->area === null) {
                    $updates['area'] = $area;
                }
                if ($updates !== []) {
                    DB::table('mosques')->where('id', $mosque->id)->update($updates);
                }
            });
    }

    public function down(): void
    {
        Schema::table('mosques', function (Blueprint $table): void {
            $table->dropIndex(['area']);
            $table->dropColumn(['rating_avg', 'reviews_count']);
        });
    }

    /** @return array{0: ?string, 1: ?string} */
    private function locationFromAddress(?string $address): array
    {
        $parts = array_values(array_filter(array_map('trim', explode(',', (string) $address))));
        if ($parts !== [] && strcasecmp($parts[array_key_last($parts)], 'Bangladesh') === 0) {
            array_pop($parts);
        }

        if (count($parts) < 2) {
            return [null, null];
        }

        $locality = preg_replace('/\s+\d{4,6}$/', '', array_pop($parts));
        if (preg_match('/\bdhaka\b/i', $locality)) {
            $district = 'Dhaka';
            $area = strcasecmp(trim($locality), 'Dhaka') === 0 ? array_pop($parts) : trim($locality);
        } elseif (preg_match('/\b(chattogram|chittagong)\b/i', $locality)) {
            $district = 'Chattogram';
            $area = preg_match('/^\s*(chattogram|chittagong)\s*$/i', $locality) ? array_pop($parts) : trim($locality);
        } else {
            $district = $locality;
            $area = array_pop($parts);
        }

        return [filled($district) ? $district : null, filled($area) ? $area : null];
    }
};
