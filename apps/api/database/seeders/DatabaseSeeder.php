<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            MosqueSeeder::class,
            MosqueProfileSeeder::class,
            VerificationRequestSeeder::class,
            FollowerSeeder::class,
            CampaignSeeder::class,
            DemoNotificationSeeder::class,
            DemoAuthenticationSeeder::class,
            DemoDataIntegritySeeder::class,
        ]);
    }
}
