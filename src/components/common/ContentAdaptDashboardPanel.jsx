/**
 * ContentAdaptDashboardPanel
 * ==========================
 * Compact dashboard widget showing the latest content format
 * recommendation per active topic.  Used in AIDashboard.
 *
 * Props:
 *   className {string}
 */

import React, { useCallback } from 'react';
import { ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useContentAdaptDashboard } from '../../hooks/useContentAdaptation';
import { contentAdapt } from '../../services/api';
import ContentFormatCard from './ContentFormatCard';

export default function ContentAdaptDashboardPanel({ className = '' }) {
  const { data, loading, error, refetch } = useContentAdaptDashboard();
  const records = data?.records ?? [];

  const handleApply = useCallback(async (id) => {
    try { await contentAdapt.apply(id); refetch(); } catch {}
  }, [refetch]);

  const handleDismiss = useCallback(async (id) => {
    try { await contentAdapt.dismiss(id); refetch(); } catch {}
  }, [refetch]);

  return (
    <div className={`bg-white border border-slate-100 rounded-2xl shadow-sm p-5 ${className}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <SparklesIcon className="h-5 w-5 text-emerald-600" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Content Format</h3>
            <p className="text-xs text-slate-400">AI-recommended learning format</p>
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

      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Analysing learning signals…</span>
        </div>
      )}

      {!loading && error && (
        <div className="py-6 text-center text-rose-600 text-sm">
          <p>{error}</p>
          <button onClick={refetch} className="mt-2 text-xs underline">Retry</button>
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="py-8 text-center text-slate-400">
          <SparklesIcon className="h-10 w-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No format recommendations yet.</p>
          <p className="text-xs mt-1">Complete a learning session to activate.</p>
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <div className="space-y-3">
          {records.map((rec) => (
            <ContentFormatCard
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
