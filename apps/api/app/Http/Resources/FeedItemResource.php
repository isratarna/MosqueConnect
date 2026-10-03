<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One entry of the personal "from my mosques" feed. Every source is normalised
 * to the same shape so the client can render a mixed list with one component.
 */
class FeedItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'type' => $this->resource['type'],
            'id' => $this->resource['id'],
            'title' => $this->resource['title'],
            'summary' => $this->resource['summary'],
            'mosque' => $this->resource['mosque'],
            'published_at' => $this->resource['published_at'],
            'url' => $this->resource['url'],
        ];
    }
}
