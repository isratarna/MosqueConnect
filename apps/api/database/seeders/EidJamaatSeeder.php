<?php

namespace Database\Seeders;

use App\Models\EidJamaat;
use App\Models\Mosque;
use App\Models\SystemSetting;
use App\Models\User;
use App\Support\EidSeason;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;

/**
 * Demo Eid data: an Eid season a super admin would normally configure in
 * Settings, plus published jamaats for the seeded mosques. Without the season
 * setting the "Eid jamaat near me" page has nothing to show, so the dates are
 * relative to the seeding day and re-seeding moves them forward.
 */
class EidJamaatSeeder extends Seeder
{
    /** Inside EidSeason::DEFAULT_LEAD_DAYS, so the season is showing straight away. */
    private const DAYS_UNTIL_EID = 12;

    public function run(): void
    {
        $expected = CarbonImmutable::now(config('prayer.timezone'))->addDays(self::DAYS_UNTIL_EID);
        $eid = EidJamaat::EID_FITR;

        $this->seedSeason($eid, $expected);

        $plans = [
            'Baitul Mukarram National Mosque' => [
                ['time' => '07:00', 'language' => 'Bangla', 'women' => true, 'notes' => 'Three jamaats this year. Come 20 minutes early; the hall fills quickly.'],
                ['time' => '08:00', 'language' => 'Bangla'],
                ['time' => '09:00', 'language' => 'Bangla', 'notes' => 'Last jamaat, held in the upper hall.'],
            ],
            'Dhanmondi Eidgah Mosque' => [
                [
                    'time' => '07:30',
                    'language' => 'Bangla',
                    'women' => true,
                    'location' => 'Dhanmondi Eidgah field, Road 8',
                    'latitude' => 23.7441000,
                    'longitude' => 90.3738000,
                    'notes' => 'Open-air jamaat on the Eidgah field. Bring your own mat. Moves into the mosque if it rains.',
                ],
                ['time' => '08:30', 'language' => 'Bangla', 'notes' => 'Inside the mosque hall.'],
            ],
            'Gulshan Society Mosque' => [
                ['time' => '07:15', 'language' => 'Bangla', 'women' => true, 'notes' => "Separate women's section on the first floor, with its own entrance from Road 63."],
                ['time' => '08:15', 'language' => 'English', 'notes' => 'Khutbah in English for the expatriate community.'],
            ],
            'Banani Central Mosque' => [
                ['time' => '07:30', 'language' => 'Bangla', 'women' => true],
                ['time' => '08:30', 'language' => 'Bangla'],
            ],
            'Mohammadpur Central Mosque' => [
                ['time' => '07:45', 'language' => 'Bangla', 'notes' => 'Parking on Tajmahal Road is limited; please walk if you can.'],
            ],
            'Star Mosque' => [
                ['time' => '08:00', 'language' => 'Bangla'],
            ],
            'Lalbagh Shahi Mosque' => [
                [
                    'time' => '07:00',
                    'language' => 'Bangla',
                    'location' => 'Lalbagh Fort grounds',
                    'latitude' => 23.7188000,
                    'longitude' => 90.3878000,
                    'notes' => 'Held on the fort grounds. Gates open at 06:15.',
                ],
            ],
            'Chawkbazar Jame Mosque' => [
                ['time' => '08:00', 'language' => 'Urdu', 'notes' => 'Khutbah in Urdu, followed by a short Bangla summary.'],
            ],
            'Anderkilla Shahi Jame Mosque' => [
                ['time' => '07:30', 'language' => 'Bangla', 'women' => true],
            ],
            'Jamiatul Falah Mosque' => [
                ['time' => '08:00', 'language' => 'Bangla', 'women' => true, 'notes' => "Women's arrangement in the annexe hall."],
            ],
        ];

        $mosques = Mosque::query()
            ->whereIn('name', array_keys($plans))
            ->get()
            ->keyBy('name');

        foreach ($plans as $name => $jamaats) {
            $mosque = $mosques->get($name);

            if (! $mosque) {
                continue;
            }

            foreach (array_values($jamaats) as $index => $jamaat) {
                EidJamaat::query()->updateOrCreate(
                    [
                        'mosque_id' => $mosque->id,
                        'eid' => $eid,
                        'year' => $expected->year,
                        'sequence' => $index + 1,
                    ],
                    [
                        'date' => $expected->toDateString(),
                        'jamaat_time' => $jamaat['time'].':00',
                        'location_name' => $jamaat['location'] ?? null,
                        'latitude' => $jamaat['latitude'] ?? null,
                        'longitude' => $jamaat['longitude'] ?? null,
                        'khutbah_language' => $jamaat['language'] ?? null,
                        'women_arrangement' => $jamaat['women'] ?? false,
                        'notes' => $jamaat['notes'] ?? null,
                        'published_at' => now(),
                    ],
                );
            }
        }
    }

    /**
     * Stores the eid_season setting the Eid pages switch on, attributed to a
     * super admin as the panel would. The show-from date is left to the
     * default two-week lead-in, which the expected date sits inside, so the
     * pages are live from the seeding day.
     */
    private function seedSeason(string $eid, CarbonImmutable $expected): void
    {
        $season = EidSeason::normalise([
            'eid' => $eid,
            'expected_date' => $expected->toDateString(),
        ]);

        SystemSetting::query()->updateOrCreate(
            ['key' => EidSeason::SETTING_KEY],
            [
                'value' => $season,
                'updated_by' => User::query()->where('role', User::ROLE_SUPER_ADMIN)->value('id'),
            ],
        );

        Cache::forget(SystemSetting::PUBLIC_CACHE_KEY);
    }
}
