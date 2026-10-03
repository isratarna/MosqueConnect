<?php

namespace App\Services\Journey;

/**
 * Google-er encoded polyline algorithm (precision 5).
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
class Polyline
{
    /**
     * Encoded string theke [lat, lng] point-er list banai.
     *
     * @return list<array{0: float, 1: float}>
     */
    public static function decode(string $encoded, int $precision = 5): array
    {
        $points = [];
        $index = 0;
        $length = strlen($encoded);
        $lat = 0;
        $lng = 0;
        $factor = 10 ** $precision;

        while ($index < $length) {
            // Prottek point-e duita value thake (lat, tarpor lng). Duitai ager
            // point theke koto change hoyeche (delta) sheta bole.
            foreach (['lat', 'lng'] as $axis) {
                $result = 0;
                $shift = 0;

                // 5-bit chunk gula jora lagai; 0x20 bit on thakle aro chunk ache.
                do {
                    $byte = ord($encoded[$index++]) - 63;
                    $result |= ($byte & 0x1F) << $shift;
                    $shift += 5;
                } while ($byte >= 0x20 && $index < $length);

                // Sobcheye chhoto bit ta sign bujhay (zig-zag encoding).
                $delta = ($result & 1) ? ~($result >> 1) : ($result >> 1);

                if ($axis === 'lat') {
                    $lat += $delta;
                } else {
                    $lng += $delta;
                }
            }

            $points[] = [round($lat / $factor, $precision), round($lng / $factor, $precision)];
        }

        return $points;
    }

    /**
     * Ulta kaj: point list theke encoded string (test fixture banate lage).
     *
     * @param  iterable<array{0: float, 1: float}>  $points
     */
    public static function encode(iterable $points, int $precision = 5): string
    {
        $factor = 10 ** $precision;
        $previous = [0, 0];
        $encoded = '';

        foreach ($points as [$lat, $lng]) {
            $current = [(int) round($lat * $factor), (int) round($lng * $factor)];

            foreach ([0, 1] as $axis) {
                $value = $current[$axis] - $previous[$axis];
                $value = $value < 0 ? ~($value << 1) : ($value << 1);

                while ($value >= 0x20) {
                    $encoded .= chr((0x20 | ($value & 0x1F)) + 63);
                    $value >>= 5;
                }

                $encoded .= chr($value + 63);
            }

            $previous = $current;
        }

        return $encoded;
    }
}
