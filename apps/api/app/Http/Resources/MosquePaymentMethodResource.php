<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MosquePaymentMethodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'account_name' => $this->account_name,
            'account_number' => $this->account_number,
            'bank_name' => $this->bank_name,
            'branch' => $this->branch,
            'routing_number' => $this->routing_number,
            'instructions' => $this->instructions,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
        ];
    }
}