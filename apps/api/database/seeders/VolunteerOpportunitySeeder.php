<?php

namespace Database\Seeders;

use App\Models\Mosque;
use App\Models\VolunteerOpportunity;
use Illuminate\Database\Seeder;

class VolunteerOpportunitySeeder extends Seeder
{
    public function run(): void
    {
        $opportunities = [
            [
                'mosque' => 'Baitul Mukarram National Mosque',
                'title' => 'Jumuah crowd and traffic support',
                'description' => 'Help guide worshippers to available prayer space and keep the entrances clear before and after Jumuah.',
                'start_time' => '12:00',
                'end_time' => '14:30',
                'location' => 'Main gate and north entrance',
                'volunteers_required' => 12,
                'requirements' => 'Please arrive 30 minutes early for a short briefing.',
                'days' => 3,
            ],
            [
                'mosque' => 'Gulshan Society Mosque',
                'title' => 'Weekend food pack distribution',
                'description' => 'Prepare and hand out food packs for families in the surrounding area.',
                'start_time' => '09:00',
                'end_time' => '12:00',
                'location' => 'Community hall, ground floor',
                'volunteers_required' => 8,
                'requirements' => 'Suitable for ages 16 and above.',
                'days' => 6,
            ],
            [
                'mosque' => 'Dhanmondi Eidgah Mosque',
                'title' => 'Library and study circle assistants',
                'description' => 'Support the weekend children\'s study circle by helping with registration and reading practice.',
                'start_time' => '16:00',
                'end_time' => '18:00',
                'location' => 'First floor library',
                'volunteers_required' => 5,
                'requirements' => null,
                'days' => 10,
            ],
        ];

        $mosques = Mosque::query()
            ->whereIn('name', array_column($opportunities, 'mosque'))
            ->get()
            ->keyBy('name');

        foreach ($opportunities as $opportunity) {
            $mosque = $mosques->get($opportunity['mosque']);

            if (! $mosque) {
                continue;
            }

            VolunteerOpportunity::query()->firstOrCreate(
                [
                    'mosque_id' => $mosque->id,
                    'title' => $opportunity['title'],
                ],
                [
                    'created_by' => $mosque->owner_id,
                    'description' => $opportunity['description'],
                    'opportunity_date' => now()->addDays($opportunity['days'])->toDateString(),
                    'start_time' => $opportunity['start_time'],
                    'end_time' => $opportunity['end_time'],
                    'location' => $opportunity['location'],
                    'volunteers_required' => $opportunity['volunteers_required'],
                    'requirements' => $opportunity['requirements'],
                    'status' => VolunteerOpportunity::STATUS_ACTIVE,
                ],
            );
        }
    }
}
