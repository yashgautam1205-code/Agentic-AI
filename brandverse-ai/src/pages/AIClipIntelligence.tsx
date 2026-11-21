import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors, Play, Check, X, Filter, SortAsc, Eye, Edit3,
  TrendingUp, Zap, Info, ChevronDown, ChevronUp, Sparkles,
  Clock, Hash, SlidersHorizontal, CheckSquare, Square,
  Layers, Video, Share2, HelpCircle
} from 'lucide-react';
import { AI_CLIPS } from '../data/mockData';
import { ScoreMeter, PlatformBadge, EmptyState } from '../components/ui/UIKit';
import { getScoreColor, cn } from '../lib/utils';
import { useToast } from '../contexts/ToastContext';
import { api } from '../lib/api';

type SortKey = 'engagementPotential' | 'hookStrength' | 'completeness' | 'topicRelevance';
type FilterPlatform = 'all' | 'instagram' | 'youtube' | 'linkedin' | 'x';

export function AIClipIntelligence() {
  const [clips, setClips] = useState<typeof AI_CLIPS>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('engagementPotential');
  const [filterPlatform, setFilterPlatform] = useState<FilterPlatform>('all');
  const [filterSelected, setFilterSelected] = useState<'all' | 'selected' | 'unselected'>('all');
  const [activeModalClip, setActiveModalClip] = useState<typeof AI_CLIPS[0] | null>(null);

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api.listClips()
      .then((data) => {
        if (!active) return;
        const records = data as Array<Record<string, unknown>>;
        setClips(records.map((record) => ({
          id: String(record.id),
          projectId: String(record.media_id),
          title: String(record.title),
          startTime: String(record.time_range_display || record.start_time),
          endTime: String(record.end_time),
          duration: String(record.duration_display || record.duration_seconds),
          transcript: String(record.transcript_excerpt),
          selectionReason: String(record.selection_reason),
          hookStrength: Number(record.hook_strength),
          completeness: Number(record.completeness),
          topicRelevance: Number(record.topic_relevance),
          engagementPotential: Number(record.engagement_potential),
          selected: Boolean(record.selected),
          platforms: (record.recommended_platforms as Array<'instagram' | 'youtube' | 'linkedin' | 'x'>) || [],
          thumbnailColor: String(record.thumbnail_color || '#1a2a4a'),
        })) as typeof AI_CLIPS);
      })
      .catch((error) => addToast(error instanceof Error ? error.message : 'Failed to load clips.', 'error'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [addToast]);

  const toggleSelected = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    api.toggleClip(id).then(() => {
      setClips(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
      addToast('Clip selection updated.', 'success');
    }).catch(error => addToast(error instanceof Error ? error.message : 'Selection update failed.', 'error'));
  };

  const selectAll = () => {
    setClips(prev => prev.map(c => ({ ...c, selected: true })));
    addToast('All 5 candidate clips selected', 'success');
  };

  const clearSelection = () => {
    setClips(prev => prev.map(c => ({ ...c, selected: false })));
    addToast('Selection cleared', 'info');
  };

  const handleGenerateContent = () => {
    const selected = clips.filter(c => c.selected);
    if (selected.length === 0) {
      addToast('Please select at least one clip first', 'warning');
      return;
    }
    addToast(`Generating platform posts for ${selected.length} clips…`, 'success');
    navigate('/content');
  };

  const sorted = [...clips]
    .filter(c => filterPlatform === 'all' || c.platforms.includes(filterPlatform))
    .filter(c => filterSelected === 'all' ? true : filterSelected === 'selected' ? c.selected : !c.selected)
    .sort((a, b) => b[sortKey] - a[sortKey]);

  const selectedCount = clips.filter(c => c.selected).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {loading && <div className="card p-5 text-sm text-secondary">Loading clip intelligence…</div>}
      {!loading && clips.length === 0 && (
        <div className="card p-5 text-sm text-secondary">No clip candidates yet. Upload media in Media Studio.</div>
      )}
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary">AI Clip Intelligence</h1>
          <p className="text-secondary text-sm mt-1">
            Explainable AI extracts high-retention segments with hook analysis and engagement predictions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button onClick={selectAll} className="btn-secondary text-xs flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-accent" /> Select All
            </button>
            <button onClick={clearSelection} className="btn-secondary text-xs flex items-center gap-1">
              <Square className="w-3.5 h-3.5 text-tertiary" /> Clear
            </button>
          </div>
          <button
            onClick={handleGenerateContent}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            Generate Posts ({selectedCount})
          </button>
        </div>
      </div>

      {/* Filters, Platform Tabs & Sorting */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Platform Filter */}
          <div className="flex items-center gap-1 bg-elevated border border-border rounded-lg p-1">
            {(['all', 'instagram', 'youtube', 'linkedin', 'x'] as FilterPlatform[]).map(p => (
              <button
                key={p}
                onClick={() => setFilterPlatform(p)}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-all capitalize',
                  filterPlatform === p ? 'bg-accent/20 text-accent font-semibold' : 'text-secondary hover:text-primary'
                )}
              >
                {p === 'all' ? 'All Platforms' : p}
              </button>
            ))}
          </div>

          {/* Selection Filter */}
          <div className="flex items-center gap-1 bg-elevated border border-border rounded-lg p-1">
            {(['all', 'selected', 'unselected'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterSelected(f)}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-all capitalize',
                  filterSelected === f ? 'bg-accent/20 text-accent font-semibold' : 'text-secondary hover:text-primary'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <SortAsc className="w-4 h-4 text-secondary" />
          <span className="text-xs text-secondary hidden sm:inline">Sort by:</span>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="input !w-auto text-xs py-1.5 bg-elevated"
          >
            <option value="engagementPotential">Engagement Potential</option>
            <option value="hookStrength">Hook Strength</option>
            <option value="completeness">Completeness</option>
            <option value="topicRelevance">Topic Relevance</option>
          </select>
        </div>
      </div>

      {/* Clip Candidates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sorted.map((clip, i) => (
          <motion.div
            key={clip.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              'card overflow-hidden transition-all duration-200 flex flex-col justify-between group',
              clip.selected ? 'border-accent/60 shadow-accent' : 'hover:border-accent/30'
            )}
          >
            {/* Top Media Thumbnail Preview */}
            <div>
              <div
                className="relative h-40 flex items-center justify-center cursor-pointer overflow-hidden"
                style={{ background: clip.thumbnailColor }}
                onClick={() => setActiveModalClip(clip)}
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 text-white ml-0.5" />
                </div>

                {/* Overlays */}
                <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                  {clip.platforms.map(p => <PlatformBadge key={p} platform={p} />)}
                </div>

                <div className="absolute top-2 right-2">
                  <span className="badge bg-black/60 text-white/90 border-white/10 font-mono text-2xs">
                    {clip.duration}
                  </span>
                </div>

                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <span className="bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-2xs text-white/80 font-mono">
                    {clip.startTime} - {clip.endTime}
                  </span>
                  <span className="badge-success text-2xs font-semibold">
                    {clip.engagementPotential}% Potential
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    onClick={() => setActiveModalClip(clip)}
                    className="text-sm font-semibold text-primary hover:text-accent cursor-pointer transition-colors line-clamp-1"
                  >
                    {clip.title}
                  </h3>
                  <button
                    onClick={(e) => toggleSelected(clip.id, e)}
                    className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                      clip.selected
                        ? 'bg-accent text-white'
                        : 'bg-elevated border border-border text-secondary hover:border-accent/40 hover:text-accent'
                    )}
                    title={clip.selected ? 'Deselect clip' : 'Select clip'}
                  >
                    {clip.selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-xs text-secondary line-clamp-2 leading-relaxed">
                  "{clip.transcript}"
                </p>

                {/* Score Meters */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                  <ScoreMeter value={clip.hookStrength} label="Hook Strength" color="#5B7FFF" />
                  <ScoreMeter value={clip.engagementPotential} label="Engagement" color="#10B981" />
                  <ScoreMeter value={clip.completeness} label="Completeness" color="#22D3EE" />
                  <ScoreMeter value={clip.topicRelevance} label="Relevance" color="#F59E0B" />
                </div>
              </div>
            </div>

            {/* Card Footer: Explainable Reason Accordion & Action Button */}
            <div className="p-4 pt-0 space-y-2">
              <button
                onClick={() => setExpanded(expanded === clip.id ? null : clip.id)}
                className="w-full flex items-center justify-between text-2xs text-secondary hover:text-primary py-1.5 transition-colors border-t border-border/40"
              >
                <span className="flex items-center gap-1.5 text-accent font-medium">
                  <Zap className="w-3 h-3" /> Explainable AI Reason
                </span>
                {expanded === clip.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <AnimatePresence>
                {expanded === clip.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-surface rounded-lg p-2.5 text-2xs text-secondary border border-border/60 space-y-1">
                      <p className="leading-relaxed">{clip.selectionReason}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setActiveModalClip(clip)}
                  className="btn-secondary w-full text-xs justify-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5 text-secondary" /> Inspect Clip
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Interactive Clip Inspector Modal */}
      <AnimatePresence>
        {activeModalClip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-elevated border border-border rounded-2xl max-w-2xl w-full overflow-hidden shadow-elevated"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50">
                <div className="flex items-center gap-2.5">
                  <span className="badge-accent text-2xs font-mono">{activeModalClip.duration}</span>
                  <h3 className="font-display font-semibold text-base text-primary truncate max-w-md">
                    {activeModalClip.title}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveModalClip(null)}
                  className="text-secondary hover:text-primary p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Simulated Video Player */}
                <div
                  className="h-52 rounded-xl flex items-center justify-center relative overflow-hidden border border-border"
                  style={{ background: activeModalClip.thumbnailColor }}
                >
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-full bg-black/50 border border-white/20 flex items-center justify-center mx-auto">
                      <Play className="w-6 h-6 text-white ml-0.5" />
                    </div>
                    <p className="text-xs text-white/80 font-mono">
                      {activeModalClip.startTime} → {activeModalClip.endTime}
                    </p>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 bg-black/70 backdrop-blur-sm p-2 rounded text-xs text-white/90 text-center">
                    "{activeModalClip.transcript}"
                  </div>
                </div>

                {/* Explainable AI Breakdown */}
                <div className="card p-4 space-y-3 bg-surface/60">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent" />
                    <h4 className="font-display font-semibold text-sm text-primary">Explainable AI Scoring Details</h4>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    {activeModalClip.selectionReason}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-elevated p-2.5 rounded-lg text-center">
                      <p className="text-2xs text-secondary">Hook Strength</p>
                      <p className="text-lg font-bold font-mono text-accent">{activeModalClip.hookStrength}%</p>
                    </div>
                    <div className="bg-elevated p-2.5 rounded-lg text-center">
                      <p className="text-2xs text-secondary">Engagement</p>
                      <p className="text-lg font-bold font-mono text-emerald">{activeModalClip.engagementPotential}%</p>
                    </div>
                    <div className="bg-elevated p-2.5 rounded-lg text-center">
                      <p className="text-2xs text-secondary">Completeness</p>
                      <p className="text-lg font-bold font-mono text-cyan">{activeModalClip.completeness}%</p>
                    </div>
                    <div className="bg-elevated p-2.5 rounded-lg text-center">
                      <p className="text-2xs text-secondary">Relevance</p>
                      <p className="text-lg font-bold font-mono text-amber">{activeModalClip.topicRelevance}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface/50">
                <button
                  onClick={() => toggleSelected(activeModalClip.id)}
                  className={cn(
                    'btn-secondary text-xs flex items-center gap-1.5',
                    activeModalClip.selected && 'border-accent text-accent'
                  )}
                >
                  <Check className="w-3.5 h-3.5" />
                  {activeModalClip.selected ? 'Selected for Generation' : 'Select This Clip'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveModalClip(null);
                      navigate('/editor');
                    }}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5 text-secondary" />
                    Open in Video Editor
                  </button>
                  <button
                    onClick={() => {
                      setActiveModalClip(null);
                      navigate('/content');
                    }}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Generate Platform Posts
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
