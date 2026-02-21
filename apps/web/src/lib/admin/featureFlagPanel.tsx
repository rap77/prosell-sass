/**
 * Feature Flag Admin Panel (Dev Only)
 *
 * Dev-only UI for toggling feature flags at runtime.
 * Enables quick testing and rollback without deployment.
 *
 * SECURITY: This component is dev-only and will NOT be
 * included in production builds due to the conditional export.
 *
 * Usage:
 * ```tsx
 * import { FeatureFlagPanel } from '@/lib/admin/featureFlagPanel';
 *
 * // In your layout or root component (dev only)
 * {process.env.NODE_ENV === 'development' && <FeatureFlagPanel />}
 * ```
 */

'use client';

import { useFeatureFlagStore } from '@/stores/featureFlagStore';

/**
 * Feature Flag Panel Component
 *
 * Fixed position panel at bottom-right of screen for easy access.
 * Shows all flags with checkboxes to toggle them.
 */
export function FeatureFlagPanel() {
  const flags = useFeatureFlagStore((s) => s.flags);
  const setFlag = useFeatureFlagStore((s) => s.set);
  const reset = useFeatureFlagStore((s) => s.reset);

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg border border-gray-700 z-50 max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Feature Flags</h3>
        <span className="text-xs text-gray-400">(Dev Only)</span>
      </div>

      <div className="space-y-2 mb-3">
        {Object.entries(flags).map(([key, value]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 p-1 rounded">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => setFlag(key, e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm font-mono text-gray-300">{key}</span>
            <span className={`text-xs ml-auto ${value ? 'text-green-400' : 'text-red-400'}`}>
              {value ? 'ON' : 'OFF'}
            </span>
          </label>
        ))}
      </div>

      <button
        onClick={reset}
        className="w-full py-1.5 px-3 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors border border-gray-600"
      >
        Reset All to Defaults
      </button>

      <div className="mt-2 text-xs text-gray-500 border-t border-gray-700 pt-2">
        Changes persist to localStorage
      </div>
    </div>
  );
}
