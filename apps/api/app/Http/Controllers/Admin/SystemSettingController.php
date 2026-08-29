<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemSettingController extends Controller
{
    public function index(): JsonResponse
    {
        $stored = SystemSetting::query()->get()->mapWithKeys(fn (SystemSetting $setting) => [$setting->key => $setting->value]);

        return response()->json([
            'data' => [...SystemSetting::DEFAULTS, ...$stored->all()],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'maintenance_notice' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'claims_enabled' => ['sometimes', 'boolean'],
            'reports_enabled' => ['sometimes', 'boolean'],
            'auto_publish_verified_mosques' => ['sometimes', 'boolean'],
        ]);

        foreach ($validated as $key => $value) {
            SystemSetting::query()->updateOrCreate(
                ['key' => $key],
                ['value' => $value, 'updated_by' => $request->user()->id],
            );
        }

        AdminAuditLog::record($request->user(), 'settings.updated', 'SystemSetting', [
            'changes' => $validated,
        ]);

        return $this->index();
    }
}
