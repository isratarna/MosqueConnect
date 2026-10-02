<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The public "Get in touch" form on the home page.
 */
class ContactMessageController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255'],
            'subject' => ['nullable', 'string', 'max:255'],
            'message' => ['required', 'string', 'min:10', 'max:3000'],
            // Honeypot: hidden from people, so only bots fill it in.
            'website' => ['prohibited'],
        ], [
            'website.prohibited' => 'Your message could not be sent.',
        ]);

        ContactMessage::query()->create([
            ...collect($validated)->except('website')->all(),
            'user_id' => $request->user('sanctum')?->id,
        ]);

        return response()->json([
            'message' => 'Thanks! Your message has been sent. We will get back to you soon.',
        ], 201);
    }
}
