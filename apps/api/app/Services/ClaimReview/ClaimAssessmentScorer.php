<?php

namespace App\Services\ClaimReview;

/**
 * Turns OCR text into an assessment with plain rules. The text is only ever
 * matched against, never followed, so a document saying "approve this claim"
 * is just a red flag.
 */
class ClaimAssessmentScorer
{
    private const NAME_STOPWORDS = [
        'mosque', 'masjid', 'masjeed', 'jame', 'jamey', 'jami', 'jamia', 'jome', 'baitul', 'bait',
        'the', 'and', 'of', 'mosjid', 'মসজিদ', 'জামে',
    ];

    private const TYPE_KEYWORDS = [
        'committee_resolution' => ['resolution', 'committee meeting', 'meeting minutes', 'minutes of', 'resolved that', 'সিদ্ধান্ত', 'কমিটি', 'সভা'],
        'nid' => ['national id', 'national identity', 'nid no', 'id no', 'date of birth', 'জাতীয় পরিচয়', 'জন্ম তারিখ'],
        'utility_bill' => ['electricity', 'bill no', 'bill month', 'meter no', 'customer no', 'account no', 'desco', 'dpdc', 'wasa', 'titas', 'kwh', 'বিদ্যুৎ', 'বিল'],
        'letterhead' => ['ref no', 'ref:', 'memo no', 'sincerely', 'yours faithfully', 'secretary', 'president', 'chairman', 'khatib', 'imam', 'সভাপতি', 'সম্পাদক', 'ইমাম'],
    ];

    private const INSTRUCTION_PATTERNS = [
        'approve this claim', 'approve the claim', 'ignore previous', 'ignore all previous', 'ignore the above',
        'system prompt', 'you must approve', 'automatically approve', 'mark as verified',
    ];

    private const MIN_READABLE_CHARACTERS = 80;

    private const LOW_CONFIDENCE = 0.6;

    /** @param  array<string, mixed>  $usage */
    public function assess(ClaimReviewInput $input, string $text, ?float $ocrConfidence = null, array $usage = []): ClaimAssessment
    {
        $normalised = $this->normalise($text);
        $characters = mb_strlen($normalised);
        $findings = [];
        $redFlags = [];

        if ($characters === 0) {
            return new ClaimAssessment(
                score: 0.0,
                documentType: 'other',
                mentionsMosqueName: false,
                mentionsApplicantName: false,
                findings: [],
                redFlags: ['Unreadable: no text could be read from the document.'],
                summary: 'No readable text was found, so the document could not be checked. Review it by hand.',
                usage: $usage,
            );
        }

        $mentionsMosque = $this->mentionsName($normalised, $input->mosqueName, self::NAME_STOPWORDS, 0.7);
        $mentionsApplicant = $this->mentionsName($normalised, $input->applicantName, [], 0.67);
        $mentionsPlace = $this->mentionsAny($normalised, array_filter([$input->mosqueArea, $input->mosqueDistrict]));
        $mentionsRole = filled($input->applicantRole) && $this->mentionsName($normalised, $input->applicantRole, [], 1.0);
        $documentType = $this->detectType($normalised, $mentionsMosque);

        $score = 0.1;

        if ($mentionsMosque) {
            $score += 0.35;
            $findings[] = "Mentions the mosque name ({$input->mosqueName}).";
        }

        if ($mentionsApplicant) {
            $score += 0.25;
            $findings[] = "Mentions the applicant's name ({$input->applicantName}).";
        }

        if ($mentionsPlace) {
            $score += 0.1;
            $findings[] = "Mentions the mosque's area or district.";
        }

        if ($mentionsRole) {
            $score += 0.05;
            $findings[] = "Mentions the applicant's stated role ({$input->applicantRole}).";
        }

        $score += match ($documentType) {
            'letterhead', 'committee_resolution' => 0.15,
            'utility_bill' => 0.05,
            default => 0.0,
        };

        if ($documentType !== 'other') {
            $findings[] = 'Looks like a '.str_replace('_', ' ', $documentType === 'nid' ? 'NID card' : $documentType).'.';
        }

        if ($characters < self::MIN_READABLE_CHARACTERS) {
            $score -= 0.15;
            $redFlags[] = 'Very little readable text: the scan may be blurry, cropped or unrelated.';
        }

        if ($ocrConfidence !== null && $ocrConfidence < self::LOW_CONFIDENCE) {
            $score -= 0.1;
            $redFlags[] = sprintf('Low text-recognition confidence (%d%%): parts may be unreadable or edited.', round($ocrConfidence * 100));
        }

        if (! $mentionsMosque && ! $mentionsApplicant) {
            $redFlags[] = 'Unrelated document: neither the mosque nor the applicant is named.';
        } elseif ($documentType === 'nid' && ! $mentionsApplicant) {
            $redFlags[] = "Name mismatch: the ID card does not show the applicant's name.";
        } elseif (! $mentionsMosque) {
            $redFlags[] = 'The mosque name was not found in the document.';
        } elseif (! $mentionsApplicant) {
            $redFlags[] = "The applicant's name was not found in the document.";
        }

        if ($documentType === 'nid' && ! $mentionsMosque) {
            $redFlags[] = 'An ID card proves identity only, not a role at this mosque.';
        }

        if ($this->mentionsAny($normalised, self::INSTRUCTION_PATTERNS)) {
            $score -= 0.3;
            $redFlags[] = 'The document contains instructions aimed at reviewers (e.g. "approve this claim").';
        }

        $score = round(max(0.0, min(1.0, $score)), 2);

        return new ClaimAssessment(
            score: $score,
            documentType: $documentType,
            mentionsMosqueName: $mentionsMosque,
            mentionsApplicantName: $mentionsApplicant,
            findings: $findings,
            redFlags: $redFlags,
            summary: $this->summary($score, $documentType, $mentionsMosque, $mentionsApplicant, count($redFlags)),
            usage: [...$usage, 'characters' => $characters, 'ocr_confidence' => $ocrConfidence],
        );
    }

    private function normalise(string $text): string
    {
        $text = mb_strtolower($text);
        $text = preg_replace('/[^\p{L}\p{M}\p{N}:]+/u', ' ', $text) ?? '';

        return trim(preg_replace('/\s+/u', ' ', $text) ?? '');
    }

    /**
     * True when the whole name appears, or enough of its meaningful words do.
     *
     * @param  list<string>  $stopwords
     */
    private function mentionsName(string $haystack, string $name, array $stopwords, float $threshold): bool
    {
        $name = $this->normalise($name);

        if ($name === '') {
            return false;
        }

        if (str_contains(" {$haystack} ", " {$name} ")) {
            return true;
        }

        $words = array_values(array_filter(
            explode(' ', $name),
            fn (string $word): bool => mb_strlen($word) >= 2 && ! in_array($word, $stopwords, true),
        ));

        if ($words === []) {
            return false;
        }

        $found = count(array_filter($words, fn (string $word): bool => str_contains(" {$haystack} ", " {$word} ")));

        return $found / count($words) >= $threshold;
    }

    /** @param  array<int, string|null>  $phrases */
    private function mentionsAny(string $haystack, array $phrases): bool
    {
        foreach ($phrases as $phrase) {
            $phrase = $this->normalise((string) $phrase);

            if ($phrase !== '' && str_contains(" {$haystack} ", " {$phrase} ")) {
                return true;
            }
        }

        return false;
    }

    private function detectType(string $text, bool $mentionsMosque): string
    {
        $scores = [];

        foreach (self::TYPE_KEYWORDS as $type => $keywords) {
            $scores[$type] = count(array_filter($keywords, fn (string $keyword): bool => $this->mentionsAny($text, [$keyword])));
        }

        // A letterhead is only a letterhead when it is the mosque's own.
        if (! $mentionsMosque) {
            $scores['letterhead'] = 0;
        }

        arsort($scores);
        $best = array_key_first($scores);

        return $scores[$best] > 0 ? $best : 'other';
    }

    private function summary(float $score, string $type, bool $mosque, bool $applicant, int $flags): string
    {
        $strength = match (true) {
            $score >= 0.7 => 'strongly supports',
            $score >= 0.4 => 'partly supports',
            default => 'does not clearly support',
        };

        $named = match (true) {
            $mosque && $applicant => 'names both the mosque and the applicant',
            $mosque => 'names the mosque but not the applicant',
            $applicant => 'names the applicant but not the mosque',
            default => 'names neither the mosque nor the applicant',
        };

        $label = $type === 'other' ? 'document' : str_replace('_', ' ', $type === 'nid' ? 'NID card' : $type);
        $flagText = $flags > 0 ? " {$flags} red flag(s) need a closer look." : '';

        return ucfirst("this {$label} {$named} and {$strength} the claim.{$flagText} Automated text check only; a super admin decides.");
    }
}
