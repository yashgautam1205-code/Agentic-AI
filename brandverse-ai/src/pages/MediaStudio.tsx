import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileVideo, FileAudio, X, CheckCircle2,
  Clock, Mic, FileText, ChevronRight, Play, Pause, RotateCcw,
  Zap, Globe, Volume2, Info, Sparkles, Layers, SlidersHorizontal
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { ProgressBar } from '../components/ui/UIKit';
import { cn } from '../lib/utils';
import { RECENT_PROJECTS } from '../data/mockData';
import { api } from '../lib/api';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: 'video' | 'audio';
  progress: number;
  status: 'uploading' | 'processing' | 'transcribing' | 'done' | 'error';
  language: string;
}

const SUPPORTED_FORMATS = {
  video: ['MP4', 'MOV', 'MKV', 'AVI', 'WEBM'],
  audio: ['MP3', 'WAV', 'M4A', 'FLAC', 'OGG', 'AAC'],
};

const PROCESSING_STEPS = [
  { id: 'upload', label: 'File Upload', icon: Upload },
  { id: 'transcode', label: 'Transcoding', icon: FileVideo },
  { id: 'transcribe', label: 'Transcription', icon: Mic },
  { id: 'analyze', label: 'AI Analysis', icon: Zap },
  { id: 'clips', label: 'Clip Detection', icon: CheckCircle2 },
];

const SAMPLE_TRANSCRIPT = [
  { time: '00:04', text: "Here's the thing most people miss about AI — it's not coming for your creativity.", speaker: 'Speaker 1 (Aryan)' },
  { time: '00:18', text: "It's coming for your mediocrity. The skills that remain irreplaceable are human intuition.", speaker: 'Speaker 1 (Aryan)' },
  { time: '00:35', text: "When you build a brand voice, consistency isn't repeating phrases; it is adhering to a philosophy.", speaker: 'Speaker 2 (Guest)' },
  { time: '00:52', text: "And that's why content repurposing fails if the intelligence layer lacks creator memory.", speaker: 'Speaker 1 (Aryan)' },
  { time: '01:15', text: "Let's break down the exact 3-step framework every multi-platform creator needs.", speaker: 'Speaker 1 (Aryan)' },
];

// Pre-generated waveform heights
const WAVEFORM_BARS = [
  18, 25, 45, 60, 32, 70, 85, 40, 55, 90, 65, 30, 48, 72, 88, 95, 60, 42, 35, 78,
  82, 50, 64, 40, 92, 100, 75, 45, 58, 80, 65, 35, 28, 62, 84, 90, 70, 48, 32, 50,
  68, 86, 92, 74, 52, 38, 64, 80, 58, 42, 60, 88, 94, 76, 50, 32, 45, 68, 82, 60
];

export function MediaStudio() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [language, setLanguage] = useState('English');
  const [selectedProject, setSelectedProject] = useState(RECENT_PROJECTS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(14); // seconds
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const fileRef = useRef<HTMLInputElement>(null);

  const { addToast } = useToast();
  const navigate = useNavigate();

  // Simulated audio playback progress
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackTime(prev => {
          if (prev >= 90) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const simulateUpload = useCallback(async (file: File) => {
    const id = `upload-${Date.now()}`;
    const isAudio = file.type.startsWith('audio') || file.name.match(/\.(mp3|wav|m4a|flac|ogg|aac)$/i);
    const upload: UploadFile = {
      id,
      name: file.name,
      size: file.size,
      type: isAudio ? 'audio' : 'video',
      progress: 0,
      status: 'uploading',
      language,
    };

    setUploads(prev => [upload, ...prev]);
    addToast(`Starting upload: ${file.name}`, 'info');

    try {
      setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'uploading' } : u));
      const result = await api.uploadMedia(file, language, progress => {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, progress } : u));
      }) as {
        status?: string;
        error_message?: string;
        clips_count?: number;
      };

      if (result.status === 'error') {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: 100, status: 'error' } : u));
        addToast(result.error_message || 'Media processing failed.', 'error');
        return;
      }

      setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: 100, status: 'done' } : u));
      addToast(`${file.name} processed successfully.`, 'success');
    } catch (error) {
      setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error' } : u));
      addToast(error instanceof Error ? error.message : 'Upload failed.', 'error');
    }
  }, [language, addToast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(simulateUpload);
  }, [simulateUpload]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(simulateUpload);
  }, [simulateUpload]);

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
    addToast('Upload removed', 'info');
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary">Media Studio</h1>
          <p className="text-secondary text-sm mt-1">
            Ingest long-form video or podcast audio, inspect speech waveforms, and trigger automated clip intelligence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/clips')}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            Jump to Clip Intelligence
          </button>
        </div>
      </div>

      {/* Language Selector */}
      <div className="card p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-xs font-semibold text-primary">Content Primary Language</p>
            <p className="text-2xs text-secondary">AI models will optimize speech diarization and vocabulary models</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {['English', 'Hindi (हिंदी)', 'Kannada (ಕನ್ನಡ)'].map(lang => {
            const shortName = lang.split(' ')[0];
            const isSel = language === shortName;
            return (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(shortName);
                  addToast(`Language set to ${shortName}`, 'info');
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  isSel ? 'bg-accent/20 text-accent border border-accent/40 shadow-sm' : 'btn-secondary text-secondary'
                )}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Dropzone & Uploads */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200',
              isDragging
                ? 'border-accent bg-accent/5 scale-[1.005]'
                : 'border-border hover:border-accent/50 hover:bg-elevated/40'
            )}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="video/*,audio/*"
              className="hidden"
              onChange={onFileChange}
            />
            <motion.div
              animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
              className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3"
            >
              <Upload className={cn('w-6 h-6', isDragging ? 'text-accent' : 'text-secondary')} />
            </motion.div>
            <h3 className="font-display font-semibold text-primary text-base mb-1">
              {isDragging ? 'Drop media file to ingest' : 'Drag & drop your podcast or video file'}
            </h3>
            <p className="text-secondary text-xs mb-5">Supports multi-track audio and high-bitrate 4K footage</p>

            {/* Format tags */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <FileVideo className="w-3.5 h-3.5 text-accent" />
                <span className="text-2xs text-secondary font-medium">Video:</span>
                {SUPPORTED_FORMATS.video.map(f => (
                  <span key={f} className="badge bg-elevated border border-border text-primary text-2xs">{f}</span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <FileAudio className="w-3.5 h-3.5 text-violet" />
                <span className="text-2xs text-secondary font-medium">Audio:</span>
                {SUPPORTED_FORMATS.audio.map(f => (
                  <span key={f} className="badge bg-elevated border border-border text-primary text-2xs">{f}</span>
                ))}
              </div>
            </div>
            <p className="text-2xs text-tertiary mt-4">Up to 10GB per file · Automatic speaker diarization · Zero audio degradation</p>
          </div>

          {/* Active Uploads */}
          <AnimatePresence>
            {uploads.map(upload => (
              <motion.div
                key={upload.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="card p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-elevated flex items-center justify-center">
                      {upload.type === 'audio' ? <FileAudio className="w-4 h-4 text-violet" /> : <FileVideo className="w-4 h-4 text-accent" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{upload.name}</p>
                      <p className="text-2xs text-tertiary">
                        {(upload.size / (1024 * 1024)).toFixed(1)} MB · {upload.language}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeUpload(upload.id)}
                    className="text-tertiary hover:text-rose p-1 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {upload.status === 'uploading' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-2xs text-secondary">
                      <span>Uploading…</span>
                      <span>{Math.round(upload.progress)}%</span>
                    </div>
                    <ProgressBar value={upload.progress} color="#5B7FFF" />
                  </div>
                )}

                {/* Steps */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
                  {PROCESSING_STEPS.map((step, i) => {
                    const stepOrder = ['upload', 'transcode', 'transcribe', 'analyze', 'clips'];
                    const stepIdx = stepOrder.indexOf(step.id);
                    const currentStatusOrder = upload.status === 'uploading' ? 0 : upload.status === 'processing' ? 1.5 : upload.status === 'transcribing' ? 2.5 : 5;
                    const isDone = currentStatusOrder > stepIdx + 0.5;
                    const isActive = currentStatusOrder >= stepIdx && currentStatusOrder <= stepIdx + 0.5;
                    const StepIcon = step.icon;

                    return (
                      <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <div className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all',
                            isDone ? 'bg-emerald/15 text-emerald border border-emerald/30' :
                            isActive ? 'bg-accent/15 text-accent border border-accent/40 animate-pulse' :
                            'bg-surface border border-border text-tertiary'
                          )}>
                            <StepIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-2xs text-tertiary whitespace-nowrap">{step.label}</span>
                        </div>
                        {i < PROCESSING_STEPS.length - 1 && (
                          <div className={cn('h-px w-6 flex-shrink-0 -mt-4', isDone ? 'bg-emerald/40' : 'bg-border')} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {upload.status === 'done' && (
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="badge-success text-2xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Transcribed & clips detected
                    </span>
                    <button
                      onClick={() => navigate('/clips')}
                      className="btn-primary text-xs flex items-center gap-1"
                    >
                      Inspect AI Clips <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Audio Waveform & Player Preview */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-sm text-primary">
                  Waveform & Speech Diarization: {selectedProject.title}
                </h3>
                <p className="text-2xs text-secondary mt-0.5">
                  Stereo 48kHz · English Audio Track · {selectedProject.duration}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge-accent text-2xs">AI Diarized</span>
                <span className="badge-success text-2xs">Synchronized</span>
              </div>
            </div>

            {/* Interactive Waveform Container */}
            <div className="relative bg-surface rounded-xl p-4 border border-border/80 overflow-hidden">
              <div className="flex items-end gap-1 h-24 w-full cursor-pointer" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = clickX / rect.width;
                setPlaybackTime(Math.round(ratio * 90));
              }}>
                {WAVEFORM_BARS.map((height, idx) => {
                  const currentPercent = (playbackTime / 90) * 100;
                  const barPercent = (idx / WAVEFORM_BARS.length) * 100;
                  const isPassed = barPercent <= currentPercent;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'flex-1 rounded-full transition-all duration-150',
                        isPassed ? 'bg-accent' : 'bg-muted hover:bg-accent/40'
                      )}
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>

              {/* Playback time needle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-cyan pointer-events-none transition-all duration-200"
                style={{ left: `${(playbackTime / 90) * 100}%` }}
              >
                <div className="w-2 h-2 rounded-full bg-cyan -ml-[3px] -mt-1 shadow-sm" />
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(p => !p)}
                  className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                  title={isPlaying ? 'Pause' : 'Play audio'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <button
                  onClick={() => setPlaybackTime(0)}
                  className="btn-secondary !p-2"
                  title="Rewind to start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="font-mono text-xs text-primary font-medium">
                  {formatSeconds(playbackTime)} <span className="text-tertiary">/ 01:30</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xs text-secondary">Speed:</span>
                {[1.0, 1.25, 1.5].map(spd => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={cn(
                      'px-2 py-1 rounded text-2xs font-mono font-medium',
                      playbackSpeed === spd ? 'bg-accent/20 text-accent border border-accent/40' : 'btn-secondary text-secondary'
                    )}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Transcript Viewer */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <h3 className="font-display font-semibold text-sm text-primary">Live Synchronized Transcript</h3>
              </div>
              <span className="text-2xs text-secondary">Click timestamp to seek playback</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {SAMPLE_TRANSCRIPT.map((seg, i) => (
                <div
                  key={i}
                  onClick={() => {
                    const [m, s] = seg.time.split(':').map(Number);
                    setPlaybackTime(m * 60 + s);
                    addToast(`Seeked to ${seg.time}`, 'info');
                  }}
                  className="p-2.5 rounded-lg bg-surface hover:bg-elevated/80 border border-border/50 cursor-pointer transition-colors flex items-start gap-3"
                >
                  <span className="badge-accent font-mono text-2xs mt-0.5">{seg.time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xs text-accent font-medium">{seg.speaker}</p>
                    <p className="text-xs text-secondary mt-0.5 leading-relaxed">{seg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Project Metadata & Recent Media */}
        <div className="space-y-6">
          {/* Active Project Metadata */}
          <div className="card p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm text-primary flex items-center gap-2">
              <Info className="w-4 h-4 text-accent" />
              Project File Specs
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-secondary">Project Title</span>
                <span className="text-primary font-medium truncate max-w-[150px]">{selectedProject.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-secondary">Format & Track</span>
                <span className="text-primary font-mono">{selectedProject.type === 'podcast' ? 'MP3 / Dual Stereo' : 'MP4 / 4K H.264'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-secondary">Total Duration</span>
                <span className="text-primary font-mono">{selectedProject.duration}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-secondary">Sample Rate</span>
                <span className="text-primary font-mono">48.0 kHz / 24-bit</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-secondary">Language</span>
                <span className="badge-accent text-2xs">{selectedProject.language}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-secondary">Clips Extracted</span>
                <span className="text-emerald font-semibold">{selectedProject.clipsGenerated} candidates</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/clips')}
              className="btn-primary w-full text-xs justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Analyze Detected Clips
            </button>
          </div>

          {/* Recent Ingested Media */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm text-primary">Recent Media</h3>
              <span className="text-2xs text-secondary">{RECENT_PROJECTS.length} files</span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {RECENT_PROJECTS.map(proj => {
                const isSelected = selectedProject.id === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setSelectedProject(proj);
                      addToast(`Selected "${proj.title}"`, 'info');
                    }}
                    className={cn(
                      'p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3',
                      isSelected ? 'border-accent/40 bg-accent/10' : 'border-border bg-surface hover:bg-elevated'
                    )}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `hsl(${proj.id.charCodeAt(1) * 35}, 25%, 20%)` }}
                    >
                      {proj.type === 'podcast' ? <FileAudio className="w-4 h-4 text-violet" /> : <Play className="w-4 h-4 text-accent" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary truncate">{proj.title}</p>
                      <p className="text-2xs text-tertiary mt-0.5">{proj.duration} · {proj.language}</p>
                    </div>
                    <span className={cn('badge text-2xs', proj.status === 'processed' ? 'badge-success' : 'badge-accent')}>
                      {proj.status === 'processed' ? 'Done' : 'Processing'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
