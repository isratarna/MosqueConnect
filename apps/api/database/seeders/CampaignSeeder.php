<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\CampaignDonation;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Database\Seeder;

class CampaignSeeder extends Seeder
{
    public function run(): void
    {
        $campaigns = [
            [
                'mosque' => 'Baitul Mukarram National Mosque',
                'title' => 'Safe Drinking Water Points for Musallis',
                'summary' => 'Install filtered drinking-water points on three busy floors before the next hot season.',
                'description' => 'The project covers commercial filtration units, stainless-steel dispensers, plumbing, and a one-year maintenance reserve. The units will serve daily worshippers, travellers, and large Friday congregations in central Dhaka.',
                'category' => Campaign::CATEGORY_MOSQUE_DEVELOPMENT,
                'target_amount' => 800000,
                'starts_on' => today()->subDays(12),
                'ends_on' => today()->addDays(48),
                'status' => Campaign::STATUS_ACTIVE,
                'donations' => [
                    ['phone' => '+8801812000201', 'amount' => 50000, 'method' => CampaignDonation::METHOD_MOBILE_BANKING, 'reference' => 'BKASH-DEMO-BM-001', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => 'For the comfort of worshippers.'],
                    ['phone' => '+8801812000202', 'amount' => 100000, 'method' => CampaignDonation::METHOD_BANK_TRANSFER, 'reference' => 'BANK-DEMO-BM-002', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => null],
                    ['phone' => '+8801812000204', 'amount' => 50000, 'method' => CampaignDonation::METHOD_CASH, 'reference' => 'CASH-DEMO-BM-003', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => 'May Allah accept it.', 'anonymous' => true],
                    ['phone' => '+8801812000206', 'amount' => 25000, 'method' => CampaignDonation::METHOD_MOBILE_BANKING, 'reference' => 'BKASH-DEMO-BM-004', 'status' => CampaignDonation::STATUS_PENDING, 'message' => null],
                    ['phone' => '+8801812000208', 'amount' => 15000, 'method' => CampaignDonation::METHOD_MOBILE_BANKING, 'reference' => 'NAGAD-DEMO-BM-005', 'status' => CampaignDonation::STATUS_REJECTED, 'message' => null],
                ],
            ],
            [
                'mosque' => 'Gulshan Society Mosque',
                'title' => 'Weekend Quran Learning Scholarships',
                'summary' => 'Fund books, teacher honoraria, and fee waivers for children from low-income households.',
                'description' => 'This six-month program will support 40 children with Qaida and Quran learning materials, trained instructors, classroom supplies, and transport assistance where needed.',
                'category' => Campaign::CATEGORY_EDUCATION,
                'target_amount' => 300000,
                'starts_on' => today()->subDays(20),
                'ends_on' => today()->addDays(25),
                'status' => Campaign::STATUS_ACTIVE,
                'donations' => [
                    ['phone' => '+8801812000203', 'amount' => 75000, 'method' => CampaignDonation::METHOD_BANK_TRANSFER, 'reference' => 'BANK-DEMO-GS-001', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => 'Please prioritise students who need books.'],
                    ['phone' => '+8801812000205', 'amount' => 54000, 'method' => CampaignDonation::METHOD_MOBILE_BANKING, 'reference' => 'BKASH-DEMO-GS-002', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => null],
                    ['phone' => '+8801812000201', 'amount' => 75000, 'method' => CampaignDonation::METHOD_CASH, 'reference' => 'CASH-DEMO-GS-003', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => null, 'anonymous' => true],
                    ['phone' => '+8801812000207', 'amount' => 12000, 'method' => CampaignDonation::METHOD_MOBILE_BANKING, 'reference' => 'NAGAD-DEMO-GS-004', 'status' => CampaignDonation::STATUS_PENDING, 'message' => null],
                ],
            ],
            [
                'mosque' => 'Banani Central Mosque',
                'title' => 'Emergency Medical Support Fund',
                'summary' => 'Replenish the neighbourhood fund used for urgent medicine, tests, and hospital admission deposits.',
                'description' => 'Verified requests are reviewed by a small welfare committee. Payments are made directly to pharmacies, diagnostic centres, or hospitals and documented for the committee.',
                'category' => Campaign::CATEGORY_HEALTHCARE,
                'target_amount' => 500000,
                'starts_on' => today()->subDays(28),
                'ends_on' => today()->addDays(12),
                'status' => Campaign::STATUS_ACTIVE,
                'donations' => [
                    ['phone' => '+8801812000202', 'amount' => 200000, 'method' => CampaignDonation::METHOD_BANK_TRANSFER, 'reference' => 'BANK-DEMO-BC-001', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => null],
                    ['phone' => '+8801812000203', 'amount' => 150000, 'method' => CampaignDonation::METHOD_MOBILE_BANKING, 'reference' => 'BKASH-DEMO-BC-002', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => 'For emergency patients.', 'anonymous' => true],
                    ['phone' => '+8801812000206', 'amount' => 125000, 'method' => CampaignDonation::METHOD_CASH, 'reference' => 'CASH-DEMO-BC-003', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => null],
                    ['phone' => '+8801812000204', 'amount' => 10000, 'method' => CampaignDonation::METHOD_MOBILE_BANKING, 'reference' => 'BKASH-DEMO-BC-004', 'status' => CampaignDonation::STATUS_REJECTED, 'message' => null],
                ],
            ],
            [
                'mosque' => 'Jamiatul Falah Mosque',
                'title' => 'Monsoon Family Food Packs',
                'summary' => 'Prepare rice, lentils, oil, salt, and oral saline packs for waterlogged neighbourhoods in Chattogram.',
                'description' => 'Each family pack is designed to cover essential dry food for approximately one week. Mosque volunteers will verify household lists and coordinate distribution with local community representatives.',
                'category' => Campaign::CATEGORY_FOOD_ESSENTIALS,
                'target_amount' => 250000,
                'starts_on' => today()->subDays(2),
                'ends_on' => today()->addDays(30),
                'status' => Campaign::STATUS_ACTIVE,
                'donations' => [
                    ['phone' => '+8801812000207', 'amount' => 5000, 'method' => CampaignDonation::METHOD_MOBILE_BANKING, 'reference' => 'BKASH-DEMO-JF-001', 'status' => CampaignDonation::STATUS_PENDING, 'message' => 'For one family pack.'],
                ],
            ],
            [
                'mosque' => 'Chawkbazar Jame Mosque',
                'title' => 'Historic Library Cataloguing and Preservation',
                'summary' => 'Proposed preservation work for old books and a searchable catalogue for students and researchers.',
                'description' => 'The draft proposal includes archival boxes, basic conservation supplies, shelving repairs, and Bengali-English catalogue entry. It remains private until the committee confirms the final budget.',
                'category' => Campaign::CATEGORY_EDUCATION,
                'target_amount' => 1200000,
                'starts_on' => today()->addDays(7),
                'ends_on' => today()->addDays(75),
                'status' => Campaign::STATUS_DRAFT,
                'donations' => [],
            ],
            [
                'mosque' => 'Dhanmondi Eidgah Mosque',
                'title' => 'Ramadan Iftar for Commuters and Students',
                'summary' => 'Completed community drive that served simple iftar meals throughout Ramadan.',
                'description' => 'Donations covered dates, water, khichuri, packaging, and cleaning. Local volunteers prepared daily meal lines for commuters, students, and people working away from home.',
                'category' => Campaign::CATEGORY_FOOD_ESSENTIALS,
                'target_amount' => 180000,
                'starts_on' => today()->subDays(95),
                'ends_on' => today()->subDays(58),
                'status' => Campaign::STATUS_COMPLETED,
                'donations' => [
                    ['phone' => '+8801812000201', 'amount' => 80000, 'method' => CampaignDonation::METHOD_BANK_TRANSFER, 'reference' => 'BANK-DEMO-DE-001', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => null],
                    ['phone' => '+8801812000205', 'amount' => 60000, 'method' => CampaignDonation::METHOD_MOBILE_BANKING, 'reference' => 'BKASH-DEMO-DE-002', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => null],
                    ['phone' => '+8801812000208', 'amount' => 40000, 'method' => CampaignDonation::METHOD_CASH, 'reference' => 'CASH-DEMO-DE-003', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => null],
                ],
            ],
            [
                'mosque' => 'Baitul Mukarram National Mosque',
                'title' => 'Courtyard Shade Extension',
                'summary' => 'A cancelled proposal to extend temporary shade over a section of the eastern courtyard.',
                'description' => 'The committee cancelled the proposal after a revised site plan conflicted with emergency access. Confirmed contributions are retained here as demo history pending offline refund records.',
                'category' => Campaign::CATEGORY_MOSQUE_DEVELOPMENT,
                'target_amount' => 400000,
                'starts_on' => today()->subDays(50),
                'ends_on' => today()->addDays(10),
                'status' => Campaign::STATUS_CANCELLED,
                'donations' => [
                    ['phone' => '+8801812000202', 'amount' => 70000, 'method' => CampaignDonation::METHOD_BANK_TRANSFER, 'reference' => 'BANK-DEMO-CS-001', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => null],
                    ['phone' => '+8801812000204', 'amount' => 50000, 'method' => CampaignDonation::METHOD_MOBILE_BANKING, 'reference' => 'BKASH-DEMO-CS-002', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => null],
                ],
            ],
            [
                'mosque' => 'Gulshan Society Mosque',
                'title' => 'Community Ambulance Equipment Upgrade',
                'summary' => 'An expired fundraising window for oxygen, a stretcher, and first-response equipment.',
                'description' => 'The campaign period ended before the full target was reached. Its confirmed contributions and progress remain available for historical admin reporting.',
                'category' => Campaign::CATEGORY_HEALTHCARE,
                'target_amount' => 600000,
                'starts_on' => today()->subDays(75),
                'ends_on' => today()->subDays(7),
                'status' => Campaign::STATUS_EXPIRED,
                'donations' => [
                    ['phone' => '+8801812000203', 'amount' => 250000, 'method' => CampaignDonation::METHOD_BANK_TRANSFER, 'reference' => 'BANK-DEMO-AE-001', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => null],
                    ['phone' => '+8801812000205', 'amount' => 200000, 'method' => CampaignDonation::METHOD_MOBILE_BANKING, 'reference' => 'BKASH-DEMO-AE-002', 'status' => CampaignDonation::STATUS_CONFIRMED, 'message' => null],
                ],
            ],
        ];

        $users = User::query()->get()->keyBy('phone');
        $mosques = Mosque::query()->with('owner')->get()->keyBy('name');

        foreach ($campaigns as $data) {
            $mosque = $mosques->get($data['mosque']);
            $donations = $data['donations'];
            unset($data['mosque'], $data['donations']);

            $campaign = Campaign::query()->updateOrCreate(
                ['mosque_id' => $mosque->id, 'title' => $data['title']],
                [
                    ...$data,
                    'created_by' => $mosque->owner->id,
                    'currency' => 'BDT',
                    'image_url' => null,
                ],
            );

            foreach ($donations as $index => $donationData) {
                $donor = $users->get($donationData['phone']);
                $confirmed = $donationData['status'] === CampaignDonation::STATUS_CONFIRMED;

                CampaignDonation::query()->updateOrCreate(
                    ['campaign_id' => $campaign->id, 'reference' => $donationData['reference']],
                    [
                        'user_id' => $donor->id,
                        'confirmed_by' => $confirmed ? $mosque->owner->id : null,
                        'donor_name' => $donor->name,
                        'contact' => $donor->phone,
                        'amount' => $donationData['amount'],
                        'payment_method' => $donationData['method'],
                        'message' => $donationData['message'],
                        'is_anonymous' => $donationData['anonymous'] ?? false,
                        'status' => $donationData['status'],
                        'confirmed_at' => $confirmed ? now()->subDays(max(1, count($donations) - $index)) : null,
                    ],
                );
            }

            $confirmedTotal = $campaign->donations()
                ->where('status', CampaignDonation::STATUS_CONFIRMED)
                ->sum('amount');

            $campaign->forceFill(['raised_amount' => $confirmedTotal])->save();
        }
    }
}
