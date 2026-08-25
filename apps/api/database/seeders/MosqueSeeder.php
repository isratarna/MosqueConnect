<?php

namespace Database\Seeders;

use App\Models\Mosque;
use App\Models\User;
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
                'owner_phone' => '+8801711000101',
                'address' => 'Topkhana Road, Paltan, Dhaka 1000, Bangladesh',
                'latitude' => 23.7290000,
                'longitude' => 90.4138000,
                'phone' => '+880 2-9559643',
                'description' => 'The national mosque of Bangladesh, located near the commercial center of Dhaka.',
                'verification_status' => 'verified',
            ],
            [
                'name' => 'Star Mosque',
                'owner_phone' => '+8801711000102',
                'address' => 'Abul Khairat Road, Armanitola, Dhaka 1100, Bangladesh',
                'latitude' => 23.7156000,
                'longitude' => 90.4013000,
                'phone' => '+880 2-7312420',
                'description' => 'A historic mosque known for its ornate star-patterned tile decoration.',
                'verification_status' => 'pending',
            ],
            [
                'name' => 'Lalbagh Shahi Mosque',
                'owner_phone' => '+8801711000103',
                'address' => 'Lalbagh Fort Road, Lalbagh, Dhaka 1211, Bangladesh',
                'latitude' => 23.7194000,
                'longitude' => 90.3885000,
                'phone' => '+880 2-9661900',
                'description' => 'A Mughal-era mosque located within the Lalbagh Fort complex.',
                'verification_status' => 'unverified',
            ],
            [
                'name' => 'Gulshan Society Mosque',
                'owner_phone' => '+8801711000104',
                'address' => 'Road 63, Gulshan 2, Dhaka 1212, Bangladesh',
                'latitude' => 23.7925000,
                'longitude' => 90.4078000,
                'phone' => '+880 2-9880000',
                'description' => 'A prominent mosque serving the Gulshan residential area.',
                'verification_status' => 'verified',
            ],

            [
                'name' => 'Banani Central Mosque',
                'owner_phone' => '+8801711000105',
                'address' => 'Road 10, Banani, Dhaka 1213, Bangladesh',
                'latitude' => 23.7937000,
                'longitude' => 90.4043000,
                'phone' => '+880 2-9870000',
                'description' => 'A well-known community mosque in Banani.',
                'verification_status' => 'verified',
            ],

            [
                'name' => 'Mohammadpur Central Mosque',
                'owner_phone' => '+8801711000106',
                'address' => 'Tajmahal Road, Mohammadpur, Dhaka 1207, Bangladesh',
                'latitude' => 23.7575000,
                'longitude' => 90.3580000,
                'phone' => '+880 2-9120000',
                'description' => 'A local mosque serving the Mohammadpur community.',
                'verification_status' => 'pending',
            ],

            [
                'name' => 'Dhanmondi Eidgah Mosque',
                'owner_phone' => '+8801711000107',
                'address' => 'Satmasjid Road, Dhanmondi, Dhaka 1209, Bangladesh',
                'latitude' => 23.7465000,
                'longitude' => 90.3760000,
                'phone' => '+880 2-9110000',
                'description' => 'A community mosque located in Dhanmondi.',
                'verification_status' => 'verified',
            ],

            [
                'name' => 'Chawkbazar Jame Mosque',
                'owner_phone' => '+8801711000108',
                'address' => 'Chawkbazar Shahi Mosque Road, Old Dhaka 1211, Bangladesh',
                'latitude' => 23.7188000,
                'longitude' => 90.3932000,
                'phone' => '+880 2-9670000',
                'description' => 'A historic mosque located in old Dhaka.',
                'verification_status' => 'verified',
            ],

            [
                'name' => 'Anderkilla Shahi Jame Mosque',
                'owner_phone' => '+8801711000109',
                'address' => 'Anderkilla, Chattogram 4000, Bangladesh',
                'latitude' => 22.3375000,
                'longitude' => 91.8312000,
                'phone' => '+880 31-616000',
                'description' => 'A historic mosque in Chittagong city.',
                'verification_status' => 'verified',
            ],

            [
                'name' => 'Jamiatul Falah Mosque',
                'owner_phone' => '+8801711000110',
                'address' => 'O.R. Nizam Road, GEC Circle, Chattogram 4000, Bangladesh',
                'latitude' => 22.3590000,
                'longitude' => 91.8225000,
                'phone' => '+880 31-655000',
                'description' => 'One of the largest mosques in Chittagong.',
                'verification_status' => 'verified',
            ],

            [
                'name' => 'Chandanpura Mosque',
                'owner_phone' => '+8801711000111',
                'address' => 'Nawab Siraj ud-Daulah Road, Chandanpura, Chattogram 4000, Bangladesh',
                'latitude' => 22.3420000,
                'longitude' => 91.8355000,
                'phone' => '+880 31-620000',
                'description' => 'A historic mosque known for its architecture.',
                'verification_status' => 'pending',
            ],

            [
                'name' => 'Nasirabad Jame Mosque',
                'owner_phone' => '+8801711000112',
                'address' => 'East Nasirabad, Chattogram 4203, Bangladesh',
                'latitude' => 22.3710000,
                'longitude' => 91.8150000,
                'phone' => '+880 31-670000',
                'description' => 'A community mosque in Nasirabad area.',
                'verification_status' => 'rejected',
            ],
        ];

        foreach ($mosques as $mosque) {
            $ownerPhone = $mosque['owner_phone'];
            unset($mosque['owner_phone']);

            $model = Mosque::query()->updateOrCreate(
                ['name' => $mosque['name']],
                $mosque,
            );

            $model->owner()->associate(
                User::query()->where('phone', $ownerPhone)->firstOrFail(),
            );
            $model->save();
        }
    }
}
