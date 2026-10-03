<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\EidJamaat;
use App\Models\SystemSetting;
use App\Support\EidSeason;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class SystemSettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => SystemSetting::allValues(),
        ]);
    }

    /** Public, no login: what every visitor's page needs. */
    public function publicIndex(): JsonResponse
    {
        return response()->json(['data' => SystemSetting::publicValues()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'maintenance_notice' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'claims_enabled' => ['sometimes', 'boolean'],
            'reports_enabled' => ['sometimes', 'boolean'],
            'eid_season' => ['sometimes', 'nullable', 'array:eid,expected_date,show_from'],
            'eid_season.eid' => ['required_with:eid_season', 'string', Rule::in(EidJamaat::EIDS)],
            'eid_season.expected_date' => ['required_with:eid_season', 'date_format:Y-m-d'],
            'eid_season.show_from' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:eid_season.expected_date'],
        ]);

        if (array_key_exists('eid_season', $validated)) {
            $validated['eid_season'] = EidSeason::normalise($validated['eid_season']);
        }

        foreach ($validated as $key => $value) {
            // The value column is not nullable. Laravel turns an empty text
            // field into null, so a cleared setting falls back to its default,
            // and one whose default is null is removed instead.
            if ($value === null) {
                if (SystemSetting::DEFAULTS[$key] === null) {
                    SystemSetting::query()->whereKey($key)->delete();

                    continue;
                }

                $value = SystemSetting::DEFAULTS[$key];
            }

            SystemSetting::query()->updateOrCreate(
                ['key' => $key],
                ['value' => $value, 'updated_by' => $request->user()->id],
            );
        }

        Cache::forget(SystemSetting::PUBLIC_CACHE_KEY);

        AdminAuditLog::record($request->user(), 'settings.updated', 'SystemSetting', [
            'changes' => $validated,
        ]);

        return $this->index();
    }
}
