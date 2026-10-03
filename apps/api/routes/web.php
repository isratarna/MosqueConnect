<?php

use Illuminate\Support\Facades\Route;

// SPA catch-all: React build lives in public/app. API and /up are excluded.
Route::get('/{any?}', function (?string $any = null) {
    $file = public_path('app/index.html');

    if (file_exists($file)) {
        return response()->file($file);
    }

    return response('MosqueConnect API', 200);
})->where('any', '(?!api/|up$).*');
