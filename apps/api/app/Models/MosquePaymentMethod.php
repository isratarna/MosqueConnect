<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'mosque_id', 'type', 'account_name', 'account_number', 'bank_name', 'branch',
    'routing_number', 'instructions', 'is_active', 'sort_order',
])]
class MosquePaymentMethod extends Model
{
    public const TYPES = ['bkash', 'nagad', 'rocket', 'bank', 'other'];

    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}