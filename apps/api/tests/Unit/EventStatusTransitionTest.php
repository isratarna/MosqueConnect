<?php

namespace Tests\Unit;

use App\Models\Event;
use DomainException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class EventStatusTransitionTest extends TestCase
{
    /**
     * @return array<string, array{string, string}>
     */
    public static function allowedTransitions(): array
    {
        return [
            'draft to published' => [Event::STATUS_DRAFT, Event::STATUS_PUBLISHED],
            'published to cancelled' => [Event::STATUS_PUBLISHED, Event::STATUS_CANCELLED],
            'published to completed' => [Event::STATUS_PUBLISHED, Event::STATUS_COMPLETED],
            'same status is a no-op' => [Event::STATUS_DRAFT, Event::STATUS_DRAFT],
        ];
    }

    #[DataProvider('allowedTransitions')]
    public function test_allowed_status_transitions(string $from, string $to): void
    {
        $event = new Event(['status' => $from]);

        $this->assertTrue($event->canTransitionTo($to));

        $event->transitionTo($to);

        $this->assertSame($to, $event->status);
    }

    public function test_invalid_status_transition_throws_domain_exception(): void
    {
        $event = new Event(['status' => Event::STATUS_DRAFT]);

        $this->assertFalse($event->canTransitionTo(Event::STATUS_COMPLETED));

        $this->expectException(DomainException::class);
        $event->transitionTo(Event::STATUS_COMPLETED);
    }
}
