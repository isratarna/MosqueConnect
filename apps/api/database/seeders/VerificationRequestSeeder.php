<?php

namespace Database\Seeders;

use App\Models\Mosque;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class VerificationRequestSeeder extends Seeder
{
    public function run(): void
    {
        $reviewer = User::query()
            ->where('phone', '+8801700000001')
            ->firstOrFail();

        $requests = [
            'Baitul Mukarram National Mosque' => [
                'status' => 'approved',
                'ai_score' => 96.40,
                'review_note' => 'Islamic Foundation administration letter and utility record verified.',
                'submitted_days_ago' => 90,
                'reviewed_days_ago' => 87,
            ],
            'Gulshan Society Mosque' => [
                'status' => 'approved',
                'ai_score' => 94.75,
                'review_note' => 'Committee resolution and address evidence match the mosque profile.',
                'submitted_days_ago' => 64,
                'reviewed_days_ago' => 61,
            ],
            'Banani Central Mosque' => [
                'status' => 'approved',
                'ai_score' => 92.20,
                'review_note' => 'Management committee documents approved after manual review.',
                'submitted_days_ago' => 52,
                'reviewed_days_ago' => 49,
            ],
            'Dhanmondi Eidgah Mosque' => [
                'status' => 'approved',
                'ai_score' => 90.10,
                'review_note' => 'Ownership and committee authorization evidence accepted.',
                'submitted_days_ago' => 43,
                'reviewed_days_ago' => 40,
            ],
            'Chawkbazar Jame Mosque' => [
                'status' => 'approved',
                'ai_score' => 91.65,
                'review_note' => 'Historic mosque committee authorization was confirmed.',
                'submitted_days_ago' => 36,
                'reviewed_days_ago' => 33,
            ],
            'Anderkilla Shahi Jame Mosque' => [
                'status' => 'approved',
                'ai_score' => 93.30,
                'review_note' => 'Submitted committee papers and location details are consistent.',
                'submitted_days_ago' => 31,
                'reviewed_days_ago' => 28,
            ],
            'Jamiatul Falah Mosque' => [
                'status' => 'approved',
                'ai_score' => 95.80,
                'review_note' => 'Administration documents accepted.',
                'submitted_days_ago' => 25,
                'reviewed_days_ago' => 22,
            ],
            'Star Mosque' => [
                'status' => 'under_human_review',
                'ai_score' => 84.35,
                'review_note' => 'A reviewer is checking the current committee authorization.',
                'submitted_days_ago' => 7,
            ],
            'Mohammadpur Central Mosque' => [
                'status' => 'ai_reviewed',
                'ai_score' => 78.60,
                'review_note' => null,
                'submitted_days_ago' => 4,
            ],
            'Chandanpura Mosque' => [
                'status' => 'pending',
                'ai_score' => null,
                'review_note' => null,
                'submitted_days_ago' => 1,
            ],
            'Nasirabad Jame Mosque' => [
                'status' => 'rejected',
                'ai_score' => 41.25,
                'review_note' => 'The authorization letter did not identify the current committee. Please resubmit.',
                'submitted_days_ago' => 18,
                'reviewed_days_ago' => 14,
            ],
        ];

        foreach ($requests as $mosqueName => $data) {
            $mosque = Mosque::query()->with('owner')->where('name', $mosqueName)->firstOrFail();
            $documentPath = 'demo/verification/'.str($mosqueName)->slug().'-committee-authorization.txt';
            $reviewed = in_array($data['status'], ['approved', 'rejected', 'under_human_review'], true);

            Storage::disk('local')->put($documentPath, implode(PHP_EOL, [
                'MosqueConnect demo verification evidence',
                'Mosque: '.$mosque->name,
                'Applicant: '.$mosque->owner->name,
                'Submitted for demonstration and testing only.',
            ]));

            VerificationRequest::query()->updateOrCreate(
                ['user_id' => $mosque->owner->id, 'mosque_id' => $mosque->id],
                [
                    'document_path' => $documentPath,
                    'status' => $data['status'],
                    'ai_score' => $data['ai_score'],
                    'ai_result' => $data['ai_score'] === null ? null : [
                        'document_type' => 'mosque_committee_authorization',
                        'name_match' => $data['ai_score'] >= 70,
                        'address_match' => $data['ai_score'] >= 75,
                        'demo_document' => true,
                    ],
                    'reviewer_id' => $reviewed ? $reviewer->id : null,
                    'review_note' => $data['review_note'],
                    'submitted_at' => now()->subDays($data['submitted_days_ago']),
                    'reviewed_at' => isset($data['reviewed_days_ago'])
                        ? now()->subDays($data['reviewed_days_ago'])
                        : null,
                ],
            );
        }
    }
}
