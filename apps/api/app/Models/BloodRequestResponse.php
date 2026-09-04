<?php

namespace App\Models;

use Database\Factories\BloodRequestResponseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'blood_request_id',
    'user_id',
    'message',
])]
class BloodRequestResponse extends Model
{
    /** @use HasFactory<BloodRequestResponseFactory> */
    use HasFactory;

    /**
     * The blood request this response is offered for.
     */
    public function bloodRequest(): BelongsTo
    {
        return $this->belongsTo(BloodRequest::class);
    }

    /**
     * The user who offered the response.
     */
    public function respondent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
