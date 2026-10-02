<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\MosquePhotoResource;
use App\Models\Mosque;
use App\Models\MosquePhoto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class MosquePhotoManagementController extends Controller
{
    public function store(Request $request, Mosque $mosque): JsonResponse
    {
        Gate::authorize('update', $mosque);
        $validated = $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'caption' => ['nullable', 'string', 'max:255'],
        ]);

        $photo = DB::transaction(function () use ($request, $mosque, $validated): MosquePhoto {
            $lockedMosque = Mosque::query()->lockForUpdate()->findOrFail($mosque->id);
            abort_if($lockedMosque->photos()->count() >= 10, 422, 'A mosque can have at most 10 photos.');

            $path = $request->file('photo')->store("mosque-photos/{$mosque->id}", 'public');
            try {
                return $lockedMosque->photos()->create([
                    'path' => $path,
                    'caption' => $validated['caption'] ?? null,
                    'sort_order' => $lockedMosque->photos()->max('sort_order') + 1,
                    'uploaded_by' => $request->user()->id,
                ]);
            } catch (\Throwable $exception) {
                Storage::disk('public')->delete($path);
                throw $exception;
            }
        });

        return response()->json([
            'message' => 'Mosque photo uploaded successfully.',
            'data' => new MosquePhotoResource($photo),
        ], 201);
    }

    public function update(Request $request, Mosque $mosque, MosquePhoto $photo): MosquePhotoResource
    {
        Gate::authorize('update', $mosque);
        $validated = $request->validate([
            'caption' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sort_order' => ['sometimes', 'integer', 'between:0,65535'],
        ]);
        $photo->update($validated);

        return new MosquePhotoResource($photo->refresh());
    }

    public function cover(Mosque $mosque, MosquePhoto $photo): JsonResponse
    {
        Gate::authorize('update', $mosque);
        $mosque->photo_path = $photo->path;
        $mosque->save();

        return response()->json([
            'message' => 'Mosque cover photo updated.',
            'mosque' => $mosque->refresh()->load('facilities'),
        ]);
    }

    public function destroy(Mosque $mosque, MosquePhoto $photo): JsonResponse
    {
        Gate::authorize('update', $mosque);
        DB::transaction(function () use ($mosque, $photo): void {
            $lockedMosque = Mosque::query()->lockForUpdate()->findOrFail($mosque->id);
            if ($lockedMosque->photo_path === $photo->path) {
                $lockedMosque->photo_path = null;
                $lockedMosque->save();
            }
            $photo->delete();
            Storage::disk('public')->delete($photo->path);
        });

        return response()->json(['message' => 'Mosque photo deleted.']);
    }
}
