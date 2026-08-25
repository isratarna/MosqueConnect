<?php

namespace Database\Seeders;

use App\Models\Follower;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Database\Seeder;

class FollowerSeeder extends Seeder
{
    public function run(): void
    {
        $follows = [
            '+8801812000201' => ['Baitul Mukarram National Mosque', 'Gulshan Society Mosque', 'Dhanmondi Eidgah Mosque'],
            '+8801812000202' => ['Baitul Mukarram National Mosque', 'Banani Central Mosque'],
            '+8801812000203' => ['Gulshan Society Mosque', 'Banani Central Mosque', 'Dhanmondi Eidgah Mosque'],
            '+8801812000204' => ['Baitul Mukarram National Mosque', 'Chawkbazar Jame Mosque'],
            '+8801812000205' => ['Gulshan Society Mosque', 'Dhanmondi Eidgah Mosque'],
            '+8801812000206' => ['Baitul Mukarram National Mosque', 'Banani Central Mosque', 'Chawkbazar Jame Mosque'],
            '+8801812000207' => ['Anderkilla Shahi Jame Mosque', 'Jamiatul Falah Mosque'],
            '+8801812000208' => ['Baitul Mukarram National Mosque', 'Jamiatul Falah Mosque'],
            '+8801711000104' => ['Baitul Mukarram National Mosque'],
            '+8801711000105' => ['Gulshan Society Mosque'],
        ];

        $users = User::query()->whereIn('phone', array_keys($follows))->get()->keyBy('phone');
        $mosques = Mosque::query()
            ->whereIn('name', collect($follows)->flatten()->unique())
            ->get()
            ->keyBy('name');

        foreach ($follows as $phone => $mosqueNames) {
            foreach ($mosqueNames as $mosqueName) {
                Follower::query()->firstOrCreate([
                    'user_id' => $users->get($phone)->id,
                    'mosque_id' => $mosques->get($mosqueName)->id,
                ]);
            }
        }
    }
}
