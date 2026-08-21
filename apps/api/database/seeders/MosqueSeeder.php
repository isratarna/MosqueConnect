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
            [
                'name' => 'Gulshan Society Mosque',
                'address' => 'Gulshan Avenue, Dhaka, Bangladesh',
                'latitude' => 23.7925000,
                'longitude' => 90.4078000,
                'phone' => '+880 2-9880000',
                'description' => 'A prominent mosque serving the Gulshan residential area.',
                'verification_status' => 'verified',
            ],

            [
                'name' => 'Banani Central Mosque',
                'address' => 'Banani, Dhaka, Bangladesh',
                'latitude' => 23.7937000,
                'longitude' => 90.4043000,
                'phone' => '+880 2-9870000',
                'description' => 'A well-known community mosque in Banani.',
                'verification_status' => 'verified',
            ],

            [
                'name' => 'Mohammadpur Central Mosque',
                'address' => 'Mohammadpur, Dhaka, Bangladesh',
                'latitude' => 23.7575000,
                'longitude' => 90.3580000,
                'phone' => '+880 2-9120000',
                'description' => 'A local mosque serving the Mohammadpur community.',
                'verification_status' => 'pending',
            ],

            [
                'name' => 'Dhanmondi Eidgah Mosque',
                'address' => 'Dhanmondi, Dhaka, Bangladesh',
                'latitude' => 23.7465000,
                'longitude' => 90.3760000,
                'phone' => '+880 2-9110000',
                'description' => 'A community mosque located in Dhanmondi.',
                'verification_status' => 'verified',
            ],

            [
                'name' => 'Chawkbazar Jame Mosque',
                'address' => 'Chawkbazar, Dhaka, Bangladesh',
                'latitude' => 23.7188000,
                'longitude' => 90.3932000,
                'phone' => '+880 2-9670000',
                'description' => 'A historic mosque located in old Dhaka.',
                'verification_status' => 'verified',
            ],

            [
                'name' => 'Anderkilla Shahi Jame Mosque',
                'address' => 'Anderkilla, Chittagong, Bangladesh',
                'latitude' => 22.3375000,
                'longitude' => 91.8312000,
                'phone' => '+880 31-616000',
                'description' => 'A historic mosque in Chittagong city.',
                'verification_status' => 'verified',
            ],

            [
                'name' => 'Jamiatul Falah Mosque',
                'address' => 'O.R. Nizam Road, Chittagong, Bangladesh',
                'latitude' => 22.3590000,
                'longitude' => 91.8225000,
                'phone' => '+880 31-655000',
                'description' => 'One of the largest mosques in Chittagong.',
                'verification_status' => 'verified',
            ],

            [
                'name' => 'Chandanpura Mosque',
                'address' => 'Chittagong, Bangladesh',
                'latitude' => 22.3420000,
                'longitude' => 91.8355000,
                'phone' => '+880 31-620000',
                'description' => 'A historic mosque known for its architecture.',
                'verification_status' => 'pending',
            ],

            [
                'name' => 'Nasirabad Jame Mosque',
                'address' => 'Nasirabad, Chittagong, Bangladesh',
                'latitude' => 22.3710000,
                'longitude' => 91.8150000,
                'phone' => '+880 31-670000',
                'description' => 'A community mosque in Nasirabad area.',
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
