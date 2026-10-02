<?php

namespace App\Services\ClaimReview;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Minimal REST client for a Document AI OCR processor, authenticated with a
 * service-account key (signed JWT exchanged for an access token).
 */
class GoogleDocumentAiClient
{
    private const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    /** @param  array{project_id?: ?string, location?: ?string, processor_id?: ?string, credentials?: ?string}  $config */
    public function __construct(private readonly array $config) {}

    /**
     * @return array{text: string, pages: int, confidence: ?float}
     *
     * @throws ClaimReviewException
     */
    public function process(string $contents, string $mimeType): array
    {
        $location = ($this->config['location'] ?? null) ?: 'us';
        $url = sprintf(
            'https://%s-documentai.googleapis.com/v1/projects/%s/locations/%s/processors/%s:process',
            $location,
            $this->required('project_id'),
            $location,
            $this->required('processor_id'),
        );

        $response = $this->send(fn () => Http::withToken($this->accessToken())
            ->acceptJson()
            ->timeout(90)
            ->post($url, [
                'rawDocument' => [
                    'content' => base64_encode($contents),
                    'mimeType' => $mimeType,
                ],
            ]));

        $document = $response->json('document') ?? [];
        $pages = $document['pages'] ?? [];
        $confidences = array_values(array_filter(array_map(
            fn (array $page) => $page['layout']['confidence'] ?? null,
            $pages,
        ), fn ($value) => $value !== null));

        return [
            'text' => (string) ($document['text'] ?? ''),
            'pages' => count($pages),
            'confidence' => $confidences === [] ? null : round(array_sum($confidences) / count($confidences), 3),
        ];
    }

    private function accessToken(): string
    {
        $credentials = $this->credentials();

        return Cache::remember('google-document-ai-token:'.md5($credentials['client_email']), now()->addMinutes(50), function () use ($credentials): string {
            $now = time();
            $segments = [
                $this->base64Url(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])),
                $this->base64Url(json_encode([
                    'iss' => $credentials['client_email'],
                    'scope' => self::SCOPE,
                    'aud' => self::TOKEN_URL,
                    'iat' => $now,
                    'exp' => $now + 3600,
                ])),
            ];

            $key = openssl_pkey_get_private($credentials['private_key']);

            if ($key === false || ! openssl_sign(implode('.', $segments), $signature, $key, OPENSSL_ALGO_SHA256)) {
                throw new ClaimReviewException('Could not sign the Google service-account token.', 401);
            }

            $segments[] = $this->base64Url($signature);

            $response = $this->send(fn () => Http::asForm()->timeout(30)->post(self::TOKEN_URL, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => implode('.', $segments),
            ]));

            return (string) $response->json('access_token');
        });
    }

    /** @return array{client_email: string, private_key: string} */
    private function credentials(): array
    {
        $raw = trim((string) $this->required('credentials'));

        if (! str_starts_with($raw, '{')) {
            $raw = is_file($raw) ? (string) file_get_contents($raw) : (string) base64_decode($raw, true);
        }

        $json = json_decode($raw, true);

        if (! is_array($json) || empty($json['client_email']) || empty($json['private_key'])) {
            throw new ClaimReviewException('Google Document AI credentials are not a valid service-account key.', 401);
        }

        return ['client_email' => $json['client_email'], 'private_key' => $json['private_key']];
    }

    /** @param  callable(): Response  $request */
    private function send(callable $request): Response
    {
        try {
            $response = $request();
        } catch (ConnectionException $e) {
            throw new ClaimReviewException('Could not reach Google Document AI: '.$e->getMessage());
        }

        if ($response->failed()) {
            $message = $response->json('error.message') ?? $response->json('error_description') ?? 'Request failed';

            throw new ClaimReviewException("Google Document AI error ({$response->status()}): {$message}", $response->status());
        }

        return $response;
    }

    private function required(string $key): string
    {
        $value = $this->config[$key] ?? null;

        if (blank($value)) {
            throw new ClaimReviewException("Google Document AI is not configured (missing {$key}).", 400);
        }

        return (string) $value;
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
