<?php

namespace App\Http\Controllers;

use App\Models\Mosque;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * A mosque's cover photo. Files live on the private local disk and are served
 * through the API, so no public storage link is needed in any environment.
 */
class MosquePhotoController extends Controller
{
    public function show(Mosque $mosque): StreamedResponse
    {
        abort_unless($mosque->photo_path && Storage::disk('local')->exists($mosque->photo_path), 404, 'This mosque has no photo.');

        return Storage::disk('local')->response($mosque->photo_path, null, [
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    public function store(Request $request, Mosque $mosque): JsonResponse
    {
        Gate::authorize('update', $mosque);

        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $previous = $mosque->photo_path;
        $mosque->photo_path = $request->file('photo')->store("mosque-photos/{$mosque->id}", 'local');
        $mosque->save();

        if ($previous && $previous !== $mosque->photo_path) {
            Storage::disk('local')->delete($previous);
        }

        return response()->json([
            'message' => 'Photo uploaded successfully.',
            'mosque' => $mosque->refresh()->load('facilities'),
        ]);
    }

    public function destroy(Mosque $mosque): JsonResponse
    {
        Gate::authorize('update', $mosque);

        if ($mosque->photo_path) {
            Storage::disk('local')->delete($mosque->photo_path);
            $mosque->photo_path = null;
            $mosque->save();
        }

        return response()->json([
            'message' => 'Photo removed.',
            'mosque' => $mosque->refresh()->load('facilities'),
        ]);
    }
}
