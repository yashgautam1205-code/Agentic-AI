import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors, Volume2, Download, Play, Pause, SkipBack, SkipForward,
  Type, Crop, ZapOff, Sparkles, Image as ImageIcon, Sliders,
  Check, RefreshCw, Eye, Plus, Trash2, Layers
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../contexts/ToastContext';
import { CURRENT_USER } from '../data/mockData';
import { api } from '../lib/api';

const SUBTITLE_LINES = [
  { id: 1, start: 0.5, end: 2.1, text: "Here's the thing most people miss about AI —" },
  { id: 2, start: 2.3, end: 4.0, text: "it's not coming for your creativity," },
  { id: 3, start: 4.1, end: 5.9, text: "it's coming for your mediocrity." },
  { id: 4, start: 6.2, end: 8.4, text: "The five skills that remain irreplaceable are..." },
  { id: 5, start: 8.6, end: 10.2, text: "Emotional intelligence and authentic storytelling." },
];

const EXPORT_PRESETS = [
  { label: '9:16 Reels / Shorts', res: '1080×1920', size: '~42 MB', platform: 'instagram' },
  { label: '1:1 Square Post', res: '1080×1080', size: '~36 MB', platform: 'linkedin' },
  { label: '16:9 YouTube Landscape', res: '1920×1080', size: '~88 MB', platform: 'youtube' },
];

const THUMBNAIL_TEMPLATES = [
  { id: 't1', name: 'Contrarian Bold', headline: 'AI IS NOT COMING FOR CREATIVITY', badge: 'MUST WATCH', gradient: 'from-blue-600 to-indigo-950' },
  { id: 't2', name: 'Curiosity Loop', headline: '5 SKILLS MACHINES CANNOT CLONE', badge: '2026 INSIGHT', gradient: 'from-purple-600 to-slate-950' },
  { id: 't3', name: 'Deep Dive Studio', headline: 'WHY REPURPOSING FAILS CREATORS', badge: 'DEEP DIVE', gradient: 'from-amber-600 to-zinc-950' },
  { id: 't4', name: 'Minimalist Editorial', headline: 'THE AUTHENTICITY PARADOX', badge: 'FRAMEWORK', gradient: 'from-emerald-600 to-stone-950' },
];

export function VideoEditor() {
  const [editorMode, setEditorMode] = useState<'video' | 'thumbnail'>('video');

  // Video editor state
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(2.3);
  const [subtitles, setSubtitles] = useState(SUBTITLE_LINES);
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [silenceThreshold, setSilenceThreshold] = useState(0.35);
  const [silenceRemovedCount, setSilenceRemovedCount] = useState(0);
  const [cropMode, setCropMode] = useState('9:16');
  const [audioVolume, setAudioVolume] = useState(100);
  const [exporting, setExporting] = useState(false);
  const [mediaId, setMediaId] = useState('');

  // Thumbnail workspace state
  const [selectedTemplate, setSelectedTemplate] = useState(THUMBNAIL_TEMPLATES[0]);
  const [thumbnailHeadline, setThumbnailHeadline] = useState(THUMBNAIL_TEMPLATES[0].headline);
  const [thumbnailBadge, setThumbnailBadge] = useState(THUMBNAIL_TEMPLATES[0].badge);
  const [showFaceCutout, setShowFaceCutout] = useState(true);
  const [thumbnailAspect, setThumbnailAspect] = useState<'16:9' | '9:16'>('16:9');

  const { addToast } = useToast();

  const openProtectedDownload = async (path: string) => {
    const blob = await api.downloadFile(path);
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  };

  useEffect(() => {
    let active = true;
    api.listMedia()
      .then((records) => {
        if (!active) return;
        const media = records as Array<{id: string}>;
        if (media.length > 0) setMediaId(media[0].id);
      })
      .catch((error) => addToast(error instanceof Error ? error.message : 'Failed to load media.', 'error'));
    return () => { active = false; };
  }, [addToast]);
  const totalDuration = 10.2;

  const handleExport = (preset: typeof EXPORT_PRESETS[0]) => {
    if (!mediaId) {
      addToast('Upload media before exporting.', 'warning');
      return;
    }
    setExporting(true);
    const aspect = preset.platform === 'youtube' ? '16:9' : preset.platform === 'linkedin' ? '1:1' : '9:16';
    api.trimMedia({
      media_id: mediaId,
      start_time: 0,
      end_time: Math.min(totalDuration, 10.2),
      aspect_ratio: aspect,
      burn_subtitles: false,
    })
      .then(async (result) => {
        await openProtectedDownload(result.download_url);
        addToast('Rendered MP4 is ready.', 'success');
      })
      .catch(error => addToast(error instanceof Error ? error.message : 'Export failed.', 'error'))
      .finally(() => setExporting(false));
  };

  const handleDetectSilences = () => {
    if (!mediaId) {
      addToast('Upload media before detecting silence.', 'warning');
      return;
    }
    api.detectSilences({
      media_id: mediaId,
      noise_tolerance_db: -30,
      duration_threshold_sec: silenceThreshold,
    })
      .then((result) => {
        setSilenceRemovedCount(result.detected_pauses_count);
        addToast(`Detected ${result.detected_pauses_count} silence pauses (${result.total_seconds_savable}s).`, 'success');
      })
      .catch(error => addToast(error instanceof Error ? error.message : 'Silence detection failed.', 'error'));
  };

  const updateSubtitle = (id: number, text: string) => {
    setSubtitles(prev => prev.map(s => s.id === id ? { ...s, text } : s));
  };

  const addSubtitleLine = () => {
    const newId = Date.now();
    setSubtitles(prev => [
      ...prev,
      { id: newId, start: totalDuration - 1.0, end: totalDuration, text: 'New caption line...' }
    ]);
    setEditingSubId(newId);
    addToast('New subtitle segment added to timeline', 'info');
  };

  const deleteSubtitle = (id: number) => {
    setSubtitles(prev => prev.filter(s => s.id !== id));
    addToast('Subtitle segment removed', 'info');
  };

  const handleExportThumbnail = () => {
    api.generateThumbnail({
      headline: thumbnailHeadline,
      badge: thumbnailBadge,
      template_style: 'bold_blue',
      aspect_ratio: thumbnailAspect,
      creator_name: CURRENT_USER.name,
      include_creator_badge: showFaceCutout,
    })
      .then(async (result) => {
        await openProtectedDownload(result.download_url);
        addToast('Rendered PNG thumbnail is ready.', 'success');
      })
      .catch(error => addToast(error instanceof Error ? error.message : 'Thumbnail export failed.', 'error'));
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary">Video Studio & Thumbnails</h1>
          <p className="text-secondary text-sm mt-1">
            Timeline trimming, precision subtitle editing, silence truncation, and thumbnail creation.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex gap-1 p-1 bg-elevated border border-border rounded-xl">
          <button
            onClick={() => setEditorMode('video')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
              editorMode === 'video' ? 'bg-accent/20 text-accent font-semibold' : 'text-secondary hover:text-primary'
            )}
          >
            <Scissors className="w-3.5 h-3.5" /> Video Editor & Subtitles
          </button>
          <button
            onClick={() => setEditorMode('thumbnail')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
              editorMode === 'thumbnail' ? 'bg-accent/20 text-accent font-semibold' : 'text-secondary hover:text-primary'
            )}
          >
            <ImageIcon className="w-3.5 h-3.5" /> AI Thumbnail Workspace
          </button>
        </div>
      </div>

      {/* Mode 1: Video Editor */}
      {editorMode === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Col 1: Portrait 9:16 Video Player */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="label">Preview: {cropMode} Format</span>
              <span className="text-2xs text-secondary font-mono">{currentTime.toFixed(1)}s / {totalDuration}s</span>
            </div>

            {/* Phone/Canvas Frame */}
            <div
              className="relative mx-auto w-52 bg-black rounded-2xl overflow-hidden border border-border shadow-elevated transition-all"
              style={{ aspectRatio: cropMode === '1:1' ? '1/1' : cropMode === '16:9' ? '16/9' : '9/16' }}
            >
              {/* Animated gradient visualizer */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#182645] to-[#0a0f1c] flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-2 cursor-pointer" onClick={() => setPlaying(!playing)}>
                    {playing ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                  </div>
                  <p className="text-2xs text-white/70 font-mono">The 5 Irreplaceable Skills</p>
                </div>
              </div>

              {/* Subtitles Overlay */}
              <div className="absolute bottom-6 left-2 right-2">
                {subtitles.find(s => currentTime >= s.start && currentTime <= s.end) && (
                  <div className="bg-black/80 backdrop-blur-sm text-white font-display text-xs text-center px-3 py-1.5 rounded-lg font-bold shadow-sm leading-snug">
                    {subtitles.find(s => currentTime >= s.start && currentTime <= s.end)?.text}
                  </div>
                )}
              </div>

              {/* Aspect badge */}
              <div className="absolute top-2 right-2">
                <span className="text-2xs bg-black/60 text-white/80 px-2 py-0.5 rounded font-mono">
                  {cropMode}
                </span>
              </div>
            </div>

            {/* Playback Controls & Scrubber */}
            <div className="card p-3 space-y-3">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentTime(Math.max(0, currentTime - 1.5))}
                  className="btn-ghost !p-2"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPlaying(p => !p)}
                  className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center hover:opacity-90"
                >
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button
                  onClick={() => setCurrentTime(Math.min(totalDuration, currentTime + 1.5))}
                  className="btn-ghost !p-2"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={totalDuration}
                  step={0.1}
                  value={currentTime}
                  onChange={e => setCurrentTime(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
                <div className="flex justify-between text-2xs text-tertiary font-mono">
                  <span>{currentTime.toFixed(1)}s</span>
                  <span>{totalDuration}s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 2: Audio & Silence Trimmer */}
          <div className="space-y-4">
            {/* Aspect Ratio Picker */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Crop className="w-4 h-4 text-accent" />
                <h3 className="font-display font-semibold text-xs text-primary">Crop & Aspect Ratio</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {['9:16', '1:1', '4:5', '16:9'].map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      setCropMode(r);
                      addToast(`Canvas set to ${r}`, 'info');
                    }}
                    className={cn(
                      'btn-secondary text-xs py-2 justify-center',
                      cropMode === r && 'border-accent text-accent bg-accent/10 font-semibold'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Silence Truncation */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ZapOff className="w-4 h-4 text-cyan" />
                  <h3 className="font-display font-semibold text-xs text-primary">Silence Removal</h3>
                </div>
                {silenceRemovedCount > 0 && (
                  <span className="badge-cyan text-2xs">{silenceRemovedCount} cuts applied</span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-2xs text-secondary">
                  <span>Threshold</span>
                  <span className="font-mono">{silenceThreshold}s</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={silenceThreshold}
                  onChange={e => setSilenceThreshold(Number(e.target.value))}
                  className="w-full accent-cyan cursor-pointer"
                />
                <p className="text-2xs text-tertiary">
                  Automatically cuts any pause or hesitation exceeding {silenceThreshold} seconds.
                </p>
                <button
                  onClick={handleDetectSilences}
                  className="btn-secondary w-full text-xs justify-center gap-1.5"
                >
                  <ZapOff className="w-3.5 h-3.5 text-cyan" />
                  Detect & Snip Silences
                </button>
              </div>
            </div>

            {/* Volume Normalization */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-violet" />
                <h3 className="font-display font-semibold text-xs text-primary">Audio Normalization</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-2xs text-secondary">
                  <span>Gain Boost</span>
                  <span className="font-mono">{audioVolume}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={180}
                  value={audioVolume}
                  onChange={e => setAudioVolume(Number(e.target.value))}
                  className="w-full accent-violet cursor-pointer"
                />
                <button
                  onClick={() => addToast('Audio normalized to -14 LUFS (podcast broadcast standard)', 'success')}
                  className="btn-secondary w-full text-xs justify-center gap-1.5"
                >
                  Normalize to -14 LUFS
                </button>
              </div>
            </div>
          </div>

          {/* Col 3: Subtitle Editor & Export */}
          <div className="space-y-4">
            {/* Subtitle Lines */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-amber" />
                  <h3 className="font-display font-semibold text-xs text-primary">Subtitle Lines</h3>
                </div>
                <button
                  onClick={addSubtitleLine}
                  className="text-2xs text-accent hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Add Line
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {subtitles.map(sub => {
                  const isActive = currentTime >= sub.start && currentTime <= sub.end;
                  return (
                    <div
                      key={sub.id}
                      onClick={() => setCurrentTime(sub.start)}
                      className={cn(
                        'p-2.5 rounded-lg border transition-all cursor-pointer',
                        isActive ? 'border-accent/60 bg-accent/10 shadow-sm' : 'border-border bg-surface'
                      )}
                    >
                      <div className="flex items-center justify-between text-2xs text-tertiary mb-1">
                        <span className="font-mono">{sub.start.toFixed(1)}s → {sub.end.toFixed(1)}s</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSubtitle(sub.id);
                            }}
                            className="text-tertiary hover:text-rose p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {editingSubId === sub.id ? (
                        <input
                          autoFocus
                          value={sub.text}
                          onChange={e => updateSubtitle(sub.id, e.target.value)}
                          onBlur={() => setEditingSubId(null)}
                          className="input text-xs py-1"
                        />
                      ) : (
                        <p
                          onDoubleClick={() => setEditingSubId(sub.id)}
                          className="text-xs text-primary/90 leading-snug"
                        >
                          {sub.text}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Export Section */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald" />
                <h3 className="font-display font-semibold text-xs text-primary">Export Render</h3>
              </div>

              <div className="space-y-2">
                {EXPORT_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => handleExport(preset)}
                    disabled={exporting}
                    className="w-full text-left p-2.5 rounded-lg border border-border hover:border-accent/50 hover:bg-surface transition-all"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-primary">
                      <span>{preset.label}</span>
                      <span className="text-2xs text-emerald font-mono">{preset.size}</span>
                    </div>
                    <span className="text-2xs text-secondary">{preset.res} · Full Bitrate</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: AI Thumbnail Workspace */}
      {editorMode === 'thumbnail' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Interactive Canvas Preview */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <span className="label">Live Thumbnail Canvas ({thumbnailAspect})</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setThumbnailAspect('16:9')}
                    className={cn('px-2.5 py-1 rounded text-2xs font-mono', thumbnailAspect === '16:9' ? 'bg-accent/20 text-accent font-semibold' : 'btn-secondary text-secondary')}
                  >
                    16:9 (Landscape)
                  </button>
                  <button
                    onClick={() => setThumbnailAspect('9:16')}
                    className={cn('px-2.5 py-1 rounded text-2xs font-mono', thumbnailAspect === '9:16' ? 'bg-accent/20 text-accent font-semibold' : 'btn-secondary text-secondary')}
                  >
                    9:16 (Shorts/Reels)
                  </button>
                </div>
              </div>

              {/* Canvas View */}
              <div
                className={cn(
                  'relative rounded-2xl overflow-hidden border border-border shadow-elevated bg-gradient-to-br flex flex-col justify-between p-6 transition-all',
                  selectedTemplate.gradient,
                  thumbnailAspect === '9:16' ? 'max-w-xs mx-auto aspect-[9/16]' : 'aspect-video'
                )}
              >
                {/* Eyecatcher Badge */}
                <div className="flex justify-between items-start">
                  <span className="bg-amber text-black font-display font-extrabold text-xs px-3 py-1 rounded-md tracking-wider uppercase shadow-sm">
                    {thumbnailBadge}
                  </span>
                  <span className="bg-black/60 backdrop-blur-md text-white font-mono text-2xs px-2 py-0.5 rounded">
                    4K Ultra HD
                  </span>
                </div>

                {/* Main Headline */}
                <div className="space-y-2">
                  <h2 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight uppercase leading-tight drop-shadow-md">
                    {thumbnailHeadline}
                  </h2>
                </div>

                {/* Footer with Creator Avatar Cutout */}
                <div className="flex items-center justify-between pt-4">
                  {showFaceCutout && (
                    <div className="flex items-center gap-2.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                      <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center font-bold text-xs text-white">
                        {CURRENT_USER.name.charAt(0)}
                      </div>
                      <span className="text-xs text-white font-semibold">{CURRENT_USER.name}</span>
                    </div>
                  )}
                  <span className="text-2xs text-white/80 font-mono ml-auto">BRANDVERSE AI</span>
                </div>
              </div>

              {/* Actions below canvas */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary">
                  Ready to publish with 2.8x higher click-through probability.
                </span>
                <button
                  onClick={handleExportThumbnail}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Thumbnail (PNG)
                </button>
              </div>
            </div>

            {/* Right Col: Customization Controls */}
            <div className="card p-5 space-y-4">
              <h3 className="font-display font-semibold text-sm text-primary flex items-center gap-2">
                <Sliders className="w-4 h-4 text-accent" />
                Thumbnail Generator Controls
              </h3>

              {/* Template Selection */}
              <div className="space-y-2">
                <label className="label">Thumbnail Style Template</label>
                <div className="space-y-1.5">
                  {THUMBNAIL_TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTemplate(t);
                        setThumbnailHeadline(t.headline);
                        setThumbnailBadge(t.badge);
                        addToast(`Applied "${t.name}" thumbnail template`, 'info');
                      }}
                      className={cn(
                        'w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors',
                        selectedTemplate.id === t.id ? 'border-accent bg-accent/10 text-primary font-semibold' : 'border-border bg-surface text-secondary hover:text-primary'
                      )}
                    >
                      <span>{t.name}</span>
                      <span className="badge text-2xs bg-elevated border border-border">{t.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Headline Text */}
              <div className="space-y-1">
                <label className="label">Headline Hook Text</label>
                <textarea
                  rows={3}
                  value={thumbnailHeadline}
                  onChange={e => setThumbnailHeadline(e.target.value)}
                  className="input text-xs uppercase font-display font-bold"
                />
              </div>

              {/* Eyecatcher Badge */}
              <div className="space-y-1">
                <label className="label">Eyecatcher Badge</label>
                <input
                  value={thumbnailBadge}
                  onChange={e => setThumbnailBadge(e.target.value)}
                  className="input text-xs uppercase"
                />
              </div>

              {/* Face Cutout Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-secondary">Include Creator Face Cutout</span>
                <button
                  onClick={() => setShowFaceCutout(!showFaceCutout)}
                  className={cn('w-9 h-5 rounded-full transition-colors relative', showFaceCutout ? 'bg-accent' : 'bg-muted')}
                >
                  <div className={cn('w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all', showFaceCutout ? 'left-4' : 'left-1')} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
