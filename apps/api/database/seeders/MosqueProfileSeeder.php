<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Event;
use App\Models\Mosque;
use App\Models\MosqueFacility;
use App\Models\User;
use Illuminate\Database\Seeder;

class MosqueProfileSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $publisher = User::query()->firstOrCreate(
            ['phone' => '+8801711000100'],
            [
                'name' => 'Mosque Profile Publisher',
                'role' => User::ROLE_MOSQUE_ADMIN,
            ],
        );

        $profiles = $this->profiles();

        Mosque::query()
            ->whereIn('name', array_keys($profiles))
            ->get()
            ->each(function (Mosque $mosque) use ($profiles, $publisher): void {
                $this->syncProfile($mosque, $profiles[$mosque->name], $publisher);
            });
    }

    /**
     * @param  array<string, mixed>  $profile
     */
    private function syncProfile(Mosque $mosque, array $profile, User $publisher): void
    {
        $mosque->prayerTimes()->delete();
        foreach ($profile['prayer_times'] as $prayer => $times) {
            $mosque->prayerTimes()->create([
                'prayer' => $prayer,
                'adhan_time' => $times['adhan'],
                'jamaat_time' => $times['jamaat'],
            ]);
        }

        $mosque->jumuahSessions()->delete();
        foreach ($profile['jumuah_sessions'] as $index => $session) {
            $mosque->jumuahSessions()->create([
                'sequence' => $index + 1,
                'label' => $session['label'],
                'khutbah_time' => $session['khutbah'] ?? null,
                'jamaat_time' => $session['jamaat'],
                'notes' => $session['notes'] ?? null,
            ]);
        }

        $mosque->facilities()->delete();
        foreach ($profile['facilities'] as $facilityKey) {
            $mosque->facilities()->create([
                'facility_key' => $facilityKey,
            ]);
        }

        foreach ($profile['announcements'] as $announcement) {
            $mosque->announcements()->updateOrCreate(
                ['title' => $announcement['title']],
                [
                    'body' => $announcement['body'],
                    'urgency' => $announcement['urgency'],
                    'status' => $announcement['status'] ?? Announcement::STATUS_PUBLISHED,
                    'published_at' => $announcement['published_at'] ?? now()->subDays($announcement['days_ago'] ?? 1),
                ],
            );
        }

        foreach ($profile['events'] as $event) {
            $mosque->events()->updateOrCreate(
                ['title' => $event['title']],
                [
                    'created_by' => $publisher->id,
                    'description' => $event['description'],
                    'category' => $event['category'],
                    'event_date' => $event['event_date'],
                    'start_time' => $event['start_time'],
                    'end_time' => $event['end_time'] ?? null,
                    'location' => $event['location'],
                    'capacity' => $event['capacity'] ?? null,
                    'registration_required' => $event['registration_required'] ?? false,
                    'status' => $event['status'] ?? Event::STATUS_PUBLISHED,
                ],
            );
        }
    }

    /**
     * Realistic late-August prayer, Jumuah, facility, announcement, and event
     * data for the seeded Bangladesh mosques.
     *
     * @return array<string, array<string, mixed>>
     */
    private function profiles(): array
    {
        $dhaka = $this->dhakaPrayerTimes();
        $chittagong = $this->chittagongPrayerTimes();

        return [
            'Baitul Mukarram National Mosque' => [
                'prayer_times' => $this->withJamaat($dhaka, [
                    'fajr' => '04:40',
                    'dhuhr' => '13:00',
                    'asr' => '16:40',
                    'maghrib' => '18:32',
                    'isha' => '19:55',
                ]),
                'jumuah_sessions' => [
                    ['label' => 'First Jumuah', 'khutbah' => '12:00', 'jamaat' => '12:20', 'notes' => 'Main hall — recommended for office-goers'],
                    ['label' => 'Second Jumuah', 'khutbah' => '13:00', 'jamaat' => '13:20', 'notes' => 'Main hall — largest congregation'],
                    ['label' => 'Third Jumuah', 'khutbah' => '14:00', 'jamaat' => '14:20', 'notes' => 'Overflow hall if the main floor is full'],
                ],
                'facilities' => [
                    MosqueFacility::WOMEN_AREA,
                    MosqueFacility::WUDU,
                    MosqueFacility::PARKING,
                    MosqueFacility::AC,
                    MosqueFacility::WHEELCHAIR,
                    MosqueFacility::LIBRARY,
                    MosqueFacility::QURAN_CLASS,
                ],
                'announcements' => [
                    [
                        'title' => 'Additional Jumuah this Friday',
                        'body' => 'Due to expected crowds around Paltan, a third Jumuah will be held at 2:20 PM in the overflow hall. Please use the north entrance after 1:45 PM.',
                        'urgency' => Announcement::URGENCY_HIGH,
                        'days_ago' => 1,
                    ],
                    [
                        'title' => 'Wudu area floor work after Isha',
                        'body' => 'The ground-floor wudu area will close tonight after Isha for tile repair and reopen before Fajr. Please use the basement wudu until then.',
                        'urgency' => Announcement::URGENCY_MEDIUM,
                        'days_ago' => 2,
                    ],
                ],
                'events' => [
                    [
                        'title' => 'Weekly Tafsir after Fajr',
                        'description' => 'Tafsir of Surah Al-Baqarah with the resident Khatib in the main hall. Open to all; arrive before the Fajr jamaat ends.',
                        'category' => Event::CATEGORY_ISLAMIC_LECTURE,
                        'event_date' => '2026-08-28',
                        'start_time' => '05:15',
                        'end_time' => '06:15',
                        'location' => 'Main prayer hall, Baitul Mukarram',
                        'capacity' => 400,
                        'registration_required' => false,
                    ],
                ],
            ],
            'Star Mosque' => [
                'prayer_times' => $this->withJamaat($dhaka, [
                    'fajr' => '04:50',
                    'dhuhr' => '13:10',
                    'asr' => '16:50',
                    'maghrib' => '18:32',
                    'isha' => '20:00',
                ]),
                'jumuah_sessions' => [
                    ['label' => 'Jumuah', 'khutbah' => '13:00', 'jamaat' => '13:20', 'notes' => 'Single congregation in the historic prayer hall'],
                ],
                'facilities' => [MosqueFacility::WUDU, MosqueFacility::QURAN_CLASS],
                'announcements' => [
                    [
                        'title' => 'Visitor hours outside prayer times',
                        'body' => 'Photography of the star-tiled façade is welcome between 10:00 AM and 12:00 PM, and again after Asr until Maghrib. Please keep voices low while jamaat is in progress.',
                        'urgency' => Announcement::URGENCY_LOW,
                        'days_ago' => 4,
                    ],
                ],
                'events' => [],
            ],
            'Lalbagh Shahi Mosque' => [
                'prayer_times' => $this->withJamaat($dhaka, [
                    'fajr' => '04:45',
                    'dhuhr' => '13:05',
                    'asr' => '16:45',
                    'maghrib' => '18:32',
                    'isha' => '19:55',
                ]),
                'jumuah_sessions' => [
                    ['label' => 'Jumuah', 'khutbah' => '13:00', 'jamaat' => '13:15', 'notes' => 'Inside the Lalbagh Fort mosque; enter through the fort gate'],
                ],
                'facilities' => [MosqueFacility::WUDU],
                'announcements' => [],
                'events' => [],
            ],
            'Gulshan Society Mosque' => [
                'prayer_times' => $this->withJamaat($dhaka, [
                    'fajr' => '04:50',
                    'dhuhr' => '13:30',
                    'asr' => '16:50',
                    'maghrib' => '18:33',
                    'isha' => '20:05',
                ]),
                'jumuah_sessions' => [
                    ['label' => 'First Jumuah', 'khutbah' => '13:00', 'jamaat' => '13:20', 'notes' => 'Main hall'],
                    ['label' => 'Second Jumuah', 'khutbah' => '14:00', 'jamaat' => '14:20', 'notes' => 'For worshippers arriving from nearby offices'],
                ],
                'facilities' => [
                    MosqueFacility::WOMEN_AREA,
                    MosqueFacility::CHILD_CARE,
                    MosqueFacility::WUDU,
                    MosqueFacility::PARKING,
                    MosqueFacility::AC,
                    MosqueFacility::WHEELCHAIR,
                    MosqueFacility::QURAN_CLASS,
                ],
                'announcements' => [
                    [
                        'title' => 'Women’s prayer floor now open daily',
                        'body' => 'The second-floor women’s musalla, with a separate wudu and lift access, is open for all five prayers. Child-minding is available during Jumuah only.',
                        'urgency' => Announcement::URGENCY_LOW,
                        'days_ago' => 5,
                    ],
                    [
                        'title' => 'Jumuah parking for wheelchair users',
                        'body' => 'Four spaces beside the south gate are reserved on Fridays. Please display a disability card on the dashboard; other vehicles will be asked to move.',
                        'urgency' => Announcement::URGENCY_MEDIUM,
                        'days_ago' => 3,
                    ],
                ],
                'events' => [
                    [
                        'title' => 'Weekend Quran class for children',
                        'description' => 'Nazera and short surah memorisation for ages 6–12. Parents may wait in the ground-floor lounge. New students should bring a notebook and a water bottle.',
                        'category' => Event::CATEGORY_QURAN_PROGRAM,
                        'event_date' => '2026-08-29',
                        'start_time' => '16:30',
                        'end_time' => '18:00',
                        'location' => 'Classroom 2, Gulshan Society Mosque',
                        'capacity' => 40,
                        'registration_required' => true,
                    ],
                ],
            ],
            'Banani Central Mosque' => [
                'prayer_times' => $this->withJamaat($dhaka, [
                    'fajr' => '04:48',
                    'dhuhr' => '13:20',
                    'asr' => '16:48',
                    'maghrib' => '18:33',
                    'isha' => '20:00',
                ]),
                'jumuah_sessions' => [
                    ['label' => 'Jumuah', 'khutbah' => '13:10', 'jamaat' => '13:30', 'notes' => 'Main hall; overflow on the first floor'],
                ],
                'facilities' => [
                    MosqueFacility::WOMEN_AREA,
                    MosqueFacility::WUDU,
                    MosqueFacility::PARKING,
                    MosqueFacility::AC,
                    MosqueFacility::WHEELCHAIR,
                ],
                'announcements' => [
                    [
                        'title' => 'AC servicing Thursday afternoon',
                        'body' => 'Main-hall air conditioning will be switched off from after Asr until Maghrib on Thursday for filter cleaning. Maghrib jamaat will still be held indoors.',
                        'urgency' => Announcement::URGENCY_MEDIUM,
                        'days_ago' => 2,
                    ],
                ],
                'events' => [
                    [
                        'title' => 'Youth Halaqah: surviving exam season',
                        'description' => 'A short talk and open discussion for students on time, salah, and exam pressure. Light snacks after Isha.',
                        'category' => Event::CATEGORY_YOUTH_PROGRAM,
                        'event_date' => '2026-08-30',
                        'start_time' => '20:30',
                        'end_time' => '21:30',
                        'location' => 'First-floor hall, Banani Central Mosque',
                        'capacity' => 60,
                        'registration_required' => false,
                    ],
                ],
            ],
            'Mohammadpur Central Mosque' => [
                'prayer_times' => $this->withJamaat($dhaka, [
                    'fajr' => '04:45',
                    'dhuhr' => '13:15',
                    'asr' => '16:45',
                    'maghrib' => '18:31',
                    'isha' => '19:55',
                ]),
                'jumuah_sessions' => [
                    ['label' => 'Jumuah', 'khutbah' => '13:00', 'jamaat' => '13:20', 'notes' => 'Khutbah in Bangla'],
                ],
                'facilities' => [
                    MosqueFacility::WOMEN_AREA,
                    MosqueFacility::CHILD_CARE,
                    MosqueFacility::WUDU,
                    MosqueFacility::QURAN_CLASS,
                ],
                'announcements' => [
                    [
                        'title' => 'New children’s Quran batch from Saturday',
                        'body' => 'A free Nazera class for ages 5–10 starts this Saturday after Asr. Register at the mosque office with a guardian’s phone number. Limited to 25 students.',
                        'urgency' => Announcement::URGENCY_LOW,
                        'days_ago' => 6,
                    ],
                ],
                'events' => [
                    [
                        'title' => 'Community blood donation camp',
                        'description' => 'Organised with a nearby diagnostic centre. Donors should eat beforehand and bring a photo ID. Women donors are welcome; a female volunteer will be present.',
                        'category' => Event::CATEGORY_VOLUNTEER_ACTIVITY,
                        'event_date' => '2026-08-28',
                        'start_time' => '10:00',
                        'end_time' => '13:00',
                        'location' => 'Courtyard, Mohammadpur Central Mosque',
                        'capacity' => 80,
                        'registration_required' => true,
                    ],
                ],
            ],
            'Dhanmondi Eidgah Mosque' => [
                'prayer_times' => $this->withJamaat($dhaka, [
                    'fajr' => '04:46',
                    'dhuhr' => '13:15',
                    'asr' => '16:46',
                    'maghrib' => '18:31',
                    'isha' => '19:58',
                ]),
                'jumuah_sessions' => [
                    ['label' => 'Jumuah', 'khutbah' => '13:05', 'jamaat' => '13:25', 'notes' => 'Jamaat on the Eidgah field if the hall overflows'],
                ],
                'facilities' => [
                    MosqueFacility::WUDU,
                    MosqueFacility::PARKING,
                    MosqueFacility::QURAN_CLASS,
                    MosqueFacility::LIBRARY,
                ],
                'announcements' => [
                    [
                        'title' => 'Janazah after Asr today',
                        'body' => 'Janazah for a community brother will be held immediately after Asr in the Eidgah field. Burial will follow at Azimpur graveyard. May Allah grant him Jannah.',
                        'urgency' => Announcement::URGENCY_HIGH,
                        'days_ago' => 0,
                    ],
                ],
                'events' => [],
            ],
            'Chawkbazar Jame Mosque' => [
                'prayer_times' => $this->withJamaat($dhaka, [
                    'fajr' => '04:42',
                    'dhuhr' => '13:00',
                    'asr' => '16:40',
                    'maghrib' => '18:30',
                    'isha' => '19:50',
                ]),
                'jumuah_sessions' => [
                    ['label' => 'Jumuah', 'khutbah' => '12:50', 'jamaat' => '13:10', 'notes' => 'Khutbah in Bangla; street access via Chawkbazar'],
                ],
                'facilities' => [MosqueFacility::WUDU, MosqueFacility::LIBRARY, MosqueFacility::QURAN_CLASS],
                'announcements' => [
                    [
                        'title' => 'Weekend minaret walk after Asr',
                        'body' => 'A short guided look at the historic minaret is offered after Asr on Saturday and Sunday. Groups of eight; meet the caretaker at the courtyard well.',
                        'urgency' => Announcement::URGENCY_LOW,
                        'days_ago' => 8,
                    ],
                ],
                'events' => [
                    [
                        'title' => 'Heritage talk: Old Dhaka mosques',
                        'description' => 'A local historian will speak on Mughal-era mosques around Chawkbazar, followed by questions. Seating is on the courtyard mats; bring a bottle of water.',
                        'category' => Event::CATEGORY_EDUCATIONAL_PROGRAM,
                        'event_date' => '2026-08-29',
                        'start_time' => '17:30',
                        'end_time' => '18:20',
                        'location' => 'Courtyard, Chawkbazar Jame Mosque',
                        'capacity' => 50,
                        'registration_required' => false,
                    ],
                ],
            ],
            'Anderkilla Shahi Jame Mosque' => [
                'prayer_times' => $this->withJamaat($chittagong, [
                    'fajr' => '04:38',
                    'dhuhr' => '13:05',
                    'asr' => '16:38',
                    'maghrib' => '18:24',
                    'isha' => '19:50',
                ]),
                'jumuah_sessions' => [
                    ['label' => 'Jumuah', 'khutbah' => '12:55', 'jamaat' => '13:15', 'notes' => 'Historic Anderkilla hill mosque'],
                ],
                'facilities' => [MosqueFacility::WUDU, MosqueFacility::LIBRARY],
                'announcements' => [
                    [
                        'title' => 'Monsoon footwear racks in the courtyard',
                        'body' => 'Please leave shoes on the covered racks during heavy rain so the inner marble stays dry. Volunteers will help during Jumuah.',
                        'urgency' => Announcement::URGENCY_LOW,
                        'days_ago' => 3,
                    ],
                ],
                'events' => [
                    [
                        'title' => 'Mosque history circle after Maghrib',
                        'description' => 'An informal sitting on the hilltop mosque’s Mughal period and its role in Chittagong’s old city. Open to visitors and regular musallis.',
                        'category' => Event::CATEGORY_EDUCATIONAL_PROGRAM,
                        'event_date' => '2026-09-04',
                        'start_time' => '18:45',
                        'end_time' => '19:30',
                        'location' => 'Inner hall, Anderkilla Shahi Jame Mosque',
                        'capacity' => 35,
                        'registration_required' => false,
                    ],
                ],
            ],
            'Jamiatul Falah Mosque' => [
                'prayer_times' => $this->withJamaat($chittagong, [
                    'fajr' => '04:35',
                    'dhuhr' => '13:00',
                    'asr' => '16:35',
                    'maghrib' => '18:24',
                    'isha' => '19:48',
                ]),
                'jumuah_sessions' => [
                    ['label' => 'First Jumuah', 'khutbah' => '12:30', 'jamaat' => '12:50', 'notes' => 'Main floor'],
                    ['label' => 'Second Jumuah', 'khutbah' => '13:30', 'jamaat' => '13:50', 'notes' => 'Main floor and gallery'],
                ],
                'facilities' => [
                    MosqueFacility::WOMEN_AREA,
                    MosqueFacility::WUDU,
                    MosqueFacility::PARKING,
                    MosqueFacility::AC,
                    MosqueFacility::WHEELCHAIR,
                    MosqueFacility::QURAN_CLASS,
                    MosqueFacility::LIBRARY,
                ],
                'announcements' => [
                    [
                        'title' => 'Flood-relief goods after Jumuah',
                        'body' => 'Dry food, drinking water, and new clothes are being collected this Friday after both Jumuah prayers for families in low-lying parts of Chattogram. Please bring items to the south courtyard tables, not inside the hall.',
                        'urgency' => Announcement::URGENCY_MEDIUM,
                        'days_ago' => 1,
                    ],
                ],
                'events' => [
                    [
                        'title' => 'Chattogram flood relief packing',
                        'description' => 'Volunteers will sort and pack donated food and clothing for distribution. Wear comfortable clothes; drinking water will be provided.',
                        'category' => Event::CATEGORY_CHARITY,
                        'event_date' => '2026-08-28',
                        'start_time' => '15:00',
                        'end_time' => '17:30',
                        'location' => 'South courtyard, Jamiatul Falah Mosque',
                        'capacity' => 120,
                        'registration_required' => true,
                    ],
                ],
            ],
            'Chandanpura Mosque' => [
                'prayer_times' => $this->withJamaat($chittagong, [
                    'fajr' => '04:40',
                    'dhuhr' => '13:10',
                    'asr' => '16:40',
                    'maghrib' => '18:24',
                    'isha' => '19:52',
                ]),
                'jumuah_sessions' => [
                    ['label' => 'Jumuah', 'khutbah' => '13:00', 'jamaat' => '13:20', 'notes' => 'Single congregation'],
                ],
                'facilities' => [MosqueFacility::WUDU],
                'announcements' => [],
                'events' => [],
            ],
            'Nasirabad Jame Mosque' => [
                'prayer_times' => [],
                'jumuah_sessions' => [],
                'facilities' => [],
                'announcements' => [],
                'events' => [],
            ],
        ];
    }

    /**
     * Approximate adhan times for Dhaka in late August.
     *
     * @return array<string, string>
     */
    private function dhakaPrayerTimes(): array
    {
        return [
            'fajr' => '04:22',
            'dhuhr' => '12:05',
            'asr' => '16:32',
            'maghrib' => '18:28',
            'isha' => '19:42',
        ];
    }

    /**
     * Approximate adhan times for Chittagong in late August.
     *
     * @return array<string, string>
     */
    private function chittagongPrayerTimes(): array
    {
        return [
            'fajr' => '04:18',
            'dhuhr' => '12:03',
            'asr' => '16:28',
            'maghrib' => '18:22',
            'isha' => '19:36',
        ];
    }

    /**
     * @param  array<string, string>  $adhan
     * @param  array<string, string>  $jamaat
     * @return array<string, array{adhan: string, jamaat: string}>
     */
    private function withJamaat(array $adhan, array $jamaat): array
    {
        $times = [];

        foreach ($adhan as $prayer => $adhanTime) {
            $times[$prayer] = [
                'adhan' => $adhanTime,
                'jamaat' => $jamaat[$prayer],
            ];
        }

        return $times;
    }
}
