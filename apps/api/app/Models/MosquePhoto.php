<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['mosque_id', 'path', 'caption', 'sort_order', 'uploaded_by'])]
class MosquePhoto extends Model
{
    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
