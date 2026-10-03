<?php

use Illuminate\Support\Facades\Route;

// SPA catch-all: React build lives in public/app. API and /up are excluded.
Route::get('/{any?}', fn () => response()->file(public_path('app/index.html')))->where('any', '(?!api/|up$).*');
