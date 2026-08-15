<?php

namespace Database\Seeders;

use App\Models\Mosque;
use Illuminate\Database\Seeder;

class MosqueSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $mosques = [
            [
                'name' => 'Baitul Mukarram National Mosque',
                'address' => 'Topkhana Road, Paltan, Dhaka 1000, Bangladesh',
                'latitude' => 23.7290000,
                'longitude' => 90.4138000,
                'phone' => '+880 2-9559643',
                'description' => 'The national mosque of Bangladesh, located near the commercial center of Dhaka.',
                'verification_status' => 'verified',
            ],
            [
                'name' => 'Star Mosque',
                'address' => 'Abul Khairat Road, Armanitola, Dhaka 1100, Bangladesh',
                'latitude' => 23.7156000,
                'longitude' => 90.4013000,
                'phone' => '+880 2-7312420',
                'description' => 'A historic mosque known for its ornate star-patterned tile decoration.',
                'verification_status' => 'pending',
            ],
            [
                'name' => 'Lalbagh Shahi Mosque',
                'address' => 'Lalbagh Fort Road, Lalbagh, Dhaka 1211, Bangladesh',
                'latitude' => 23.7194000,
                'longitude' => 90.3885000,
                'phone' => '+880 2-9661900',
                'description' => 'A Mughal-era mosque located within the Lalbagh Fort complex.',
                'verification_status' => 'unverified',
            ],
        ];

        foreach ($mosques as $mosque) {
            Mosque::updateOrCreate(
                ['name' => $mosque['name']],
                $mosque,
            );
        }
    }
}
