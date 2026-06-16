import React, { useState } from 'react';
import { 
  SparklesIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  ArrowsPointingOutIcon,
  MagnifyingGlassMinusIcon,
  BoltIcon,
  PhotoIcon,
  DocumentTextIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';

const getIconForType = (type) => {
  switch (type) {
    case 'expansion': return <ArrowsPointingOutIcon className="w-5 h-5 text-blue-500" />;
    case 'simplification': return <MagnifyingGlassMinusIcon className="w-5 h-5 text-emerald-500" />;
    case 'reinforcement': return <BoltIcon className="w-5 h-5 text-amber-500" />;
    case 'visual_added': return <PhotoIcon className="w-5 h-5 text-purple-500" />;
    case 'format_change': return <DocumentTextIcon className="w-5 h-5 text-pink-500" />;
    case 'tone_adjustment': return <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-orange-500" />;
    default: return <SparklesIcon className="w-5 h-5 text-indigo-500" />;
  }
};

const getBadgeStyle = (type) => {
  switch (type) {
    case 'expansion': return 'bg-blue-50 border-blue-100 text-blue-700';
    case 'simplification': return 'bg-emerald-50 border-emerald-100 text-emerald-700';
    case 'reinforcement': return 'bg-amber-50 border-amber-100 text-amber-700';
    case 'visual_added': return 'bg-purple-50 border-purple-100 text-purple-700';
    case 'format_change': return 'bg-pink-50 border-pink-100 text-pink-700';
    case 'tone_adjustment': return 'bg-orange-50 border-orange-100 text-orange-700';
    default: return 'bg-indigo-50 border-indigo-100 text-indigo-700';
  }
};

const formatTypeLabel = (type) => {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function MaterialAdaptationShowcase({ adaptations, lastAdaptedAt }) {
  const [expanded, setExpanded] = useState(false);

  if (!adaptations || adaptations.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 overflow-hidden transition-all duration-300">
      <div 
        className="p-4 cursor-pointer flex items-center justify-between hover:bg-white/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-xl shadow-sm shadow-indigo-200">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Material Dynamically Restructured</h3>
            <p className="text-xs text-slate-500">
              Adapted based on your recent assessment {lastAdaptedAt && ` • ${new Date(lastAdaptedAt).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        <button className="p-2 rounded-full hover:bg-indigo-100/50 transition-colors text-indigo-500">
          {expanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
        </button>
      </div>

      <div 
        className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-0">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-200 to-transparent mb-4" />
            <p className="text-sm text-slate-600 mb-4 px-2">
              Our AI curriculum engine analyzed your assessment and rebuilt your material. Here is exactly what changed:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {adaptations.map((adaptation, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-3 p-3 rounded-xl border bg-white/80 backdrop-blur-sm shadow-sm ${getBadgeStyle(adaptation.type)}`}
                  style={{ borderColor: 'rgba(0,0,0,0.05)' }}
                >
                  <div className="mt-0.5 shrink-0">
                    {getIconForType(adaptation.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                        {formatTypeLabel(adaptation.type)}
                      </span>
                      <span className="text-xs opacity-50">•</span>
                      <span className="text-xs font-medium opacity-90 truncate max-w-[120px]" title={adaptation.focusArea}>
                        {adaptation.focusArea}
                      </span>
                    </div>
                    <p className="text-sm opacity-90 leading-snug">
                      {adaptation.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
