<?php

namespace Database\Seeders;

use App\Models\BloodRequest;
use App\Models\User;
use Illuminate\Database\Seeder;

class BloodRequestSeeder extends Seeder
{
    public function run(): void
    {
        $requests = [
            [
                'phone' => '+8801812000201',
                'blood_group' => 'O+',
                'units' => 2,
                'hospital_or_location' => 'Dhaka Medical College Hospital, Bakshibazar',
                'urgency' => 'critical',
                'contact_name' => 'Ayesha Rahman',
                'contact_phone' => '+8801812000201',
                'notes' => 'Emergency surgery scheduled tomorrow morning. Donors please contact before travelling.',
                'days' => 1,
            ],
            [
                'phone' => '+8801812000202',
                'blood_group' => 'AB-',
                'units' => 1,
                'hospital_or_location' => 'Square Hospital, Panthapath',
                'urgency' => 'high',
                'contact_name' => 'Nusrat Jahan',
                'contact_phone' => '+8801812000202',
                'notes' => 'Rare group needed for a thalassaemia patient.',
                'days' => 4,
            ],
            [
                'phone' => '+8801812000203',
                'blood_group' => 'B+',
                'units' => 3,
                'hospital_or_location' => 'Chattogram Medical College Hospital',
                'urgency' => 'medium',
                'contact_name' => 'Imran Hossain',
                'contact_phone' => '+8801812000203',
                'notes' => 'Planned operation next week; donors can schedule a convenient time.',
                'days' => 9,
            ],
        ];

        $users = User::query()
            ->whereIn('phone', array_column($requests, 'phone'))
            ->get()
            ->keyBy('phone');

        foreach ($requests as $request) {
            $creator = $users->get($request['phone']);

            if (! $creator) {
                continue;
            }

            BloodRequest::query()->firstOrCreate(
                [
                    'created_by' => $creator->id,
                    'blood_group' => $request['blood_group'],
                    'hospital_or_location' => $request['hospital_or_location'],
                ],
                [
                    'units' => $request['units'],
                    'required_date' => now()->addDays($request['days'])->toDateString(),
                    'urgency' => $request['urgency'],
                    'contact_name' => $request['contact_name'],
                    'contact_phone' => $request['contact_phone'],
                    'notes' => $request['notes'],
                    'status' => BloodRequest::STATUS_ACTIVE,
                ],
            );
        }
    }
}
