/**
 * AdaptiveDashboardPanel
 * ======================
 * Shows the latest adaptive recommendation per topic on the student dashboard.
 * Fetches from GET /api/adaptive/dashboard (latest active record per topic).
 *
 * Props:
 *   className {string}
 */

import React, { useCallback } from 'react';
import { ArrowPathIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { useAdaptiveDashboard } from '../../hooks/useAdaptiveLearning';
import { adaptive } from '../../services/api';
import AdaptiveRecommendationCard from './AdaptiveRecommendationCard';

export default function AdaptiveDashboardPanel({ className = '' }) {
  const { data, loading, error, refetch } = useAdaptiveDashboard();
  const records = data?.records ?? [];

  const handleApply = useCallback(async (recordId) => {
    try { await adaptive.apply(recordId); refetch(); } catch {}
  }, [refetch]);

  const handleDismiss = useCallback(async (recordId) => {
    try { await adaptive.dismiss(recordId); refetch(); } catch {}
  }, [refetch]);

  return (
    <div className={`bg-white border border-slate-100 rounded-2xl shadow-sm p-5 ${className}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
            <CpuChipIcon className="h-5 w-5 text-violet-600" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Adaptive Engine</h3>
            <p className="text-xs text-slate-400">Personalised next-step recommendations</p>
          </div>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40"
          title="Refresh"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Analysing learning signals…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="py-6 text-center text-rose-600 text-sm">
          <p>{error}</p>
          <button onClick={refetch} className="mt-2 text-xs underline">Retry</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && records.length === 0 && (
        <div className="py-8 text-center text-slate-400">
          <CpuChipIcon className="h-10 w-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No adaptive recommendations yet.</p>
          <p className="text-xs mt-1">Complete a learning session to activate the engine.</p>
        </div>
      )}

      {/* Records */}
      {!loading && !error && records.length > 0 && (
        <div className="space-y-3">
          {records.map((rec) => (
            <AdaptiveRecommendationCard
              key={rec._id}
              record={rec}
              onApply={handleApply}
              onDismiss={handleDismiss}
              compact={records.length > 2}
            />
          ))}
        </div>
      )}
    </div>
  );
}
