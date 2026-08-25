<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Stable demo identities keep seeded relationships repeatable and make the
     * phone/OTP login flow easy to exercise from the web application or API.
     */
    public function run(): void
    {
        $users = [
            ['name' => 'Mahmudul Hasan', 'phone' => '+8801700000001', 'role' => User::ROLE_SUPER_ADMIN],

            ['name' => 'Abdul Karim', 'phone' => '+8801711000101', 'role' => User::ROLE_MOSQUE_ADMIN],
            ['name' => 'Md. Rafiqul Islam', 'phone' => '+8801711000102', 'role' => User::ROLE_MOSQUE_ADMIN],
            ['name' => 'Hafiz Nurul Amin', 'phone' => '+8801711000103', 'role' => User::ROLE_MOSQUE_ADMIN],
            ['name' => 'Farhan Ahmed', 'phone' => '+8801711000104', 'role' => User::ROLE_MOSQUE_ADMIN],
            ['name' => 'M. Ashraful Haque', 'phone' => '+8801711000105', 'role' => User::ROLE_MOSQUE_ADMIN],
            ['name' => 'Abu Sayeed', 'phone' => '+8801711000106', 'role' => User::ROLE_MOSQUE_ADMIN],
            ['name' => 'Shahriar Kabir', 'phone' => '+8801711000107', 'role' => User::ROLE_MOSQUE_ADMIN],
            ['name' => 'Mawlana Habibur Rahman', 'phone' => '+8801711000108', 'role' => User::ROLE_MOSQUE_ADMIN],
            ['name' => 'Mohammad Yousuf', 'phone' => '+8801711000109', 'role' => User::ROLE_MOSQUE_ADMIN],
            ['name' => 'Abdul Mannan', 'phone' => '+8801711000110', 'role' => User::ROLE_MOSQUE_ADMIN],
            ['name' => 'Syed Imran Hossain', 'phone' => '+8801711000111', 'role' => User::ROLE_MOSQUE_ADMIN],
            ['name' => 'Kazi Abdullah Al Mamun', 'phone' => '+8801711000112', 'role' => User::ROLE_MOSQUE_ADMIN],

            ['name' => 'Ayesha Rahman', 'phone' => '+8801812000201', 'role' => User::ROLE_NORMAL_USER],
            ['name' => 'Tanvir Hossain', 'phone' => '+8801812000202', 'role' => User::ROLE_NORMAL_USER],
            ['name' => 'Nusrat Jahan', 'phone' => '+8801812000203', 'role' => User::ROLE_NORMAL_USER],
            ['name' => 'Mehedi Hasan', 'phone' => '+8801812000204', 'role' => User::ROLE_NORMAL_USER],
            ['name' => 'Farzana Akter', 'phone' => '+8801812000205', 'role' => User::ROLE_NORMAL_USER],
            ['name' => 'Sabbir Ahmed', 'phone' => '+8801812000206', 'role' => User::ROLE_NORMAL_USER],
            ['name' => 'Tahmina Chowdhury', 'phone' => '+8801812000207', 'role' => User::ROLE_NORMAL_USER],
            ['name' => 'Rezaul Karim', 'phone' => '+8801812000208', 'role' => User::ROLE_NORMAL_USER],
        ];

        foreach ($users as $user) {
            User::query()->updateOrCreate(['phone' => $user['phone']], $user);
        }
    }
}
