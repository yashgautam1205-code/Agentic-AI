import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Filter, Grid2x2, List, Film, Scissors,
  FileText, Folder, Calendar, Download, Eye, Hash, Play,
  Plus, ExternalLink, ArrowRight
} from 'lucide-react';
import { RECENT_PROJECTS, AI_CLIPS } from '../data/mockData';
import { PlatformBadge, EmptyState } from '../components/ui/UIKit';
import { getRelativeTime, getStatusColor, getStatusLabel, cn } from '../lib/utils';
import { useToast } from '../contexts/ToastContext';
import { api } from '../lib/api';

type LibTab = 'all' | 'projects' | 'clips' | 'captions';
type GridMode = 'grid' | 'list';

export function ContentLibrary() {
  const [tab, setTab] = useState<LibTab>('all');
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [gridMode, setGridMode] = useState<GridMode>('list');
  const [library, setLibrary] = useState<{projects: typeof RECENT_PROJECTS; clips: typeof AI_CLIPS; captions: Array<{id: string; title: string | null; platform: string; language: string; caption: string; characterCount: number}>}>({
    projects: [],
    clips: [],
    captions: [],
  });
  const [loading, setLoading] = useState(true);

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearch(q);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    api.getLibrary(search)
      .then((data) => {
        if (!active) return;
        const result = data as {
          projects: typeof RECENT_PROJECTS;
          clips: typeof AI_CLIPS;
          captions: Array<{id: string; title: string | null; platform: string; language: string; caption: string; characterCount: number}>;
        };
        setLibrary(result);
      })
      .catch((error) => addToast(error instanceof Error ? error.message : 'Failed to load library.', 'error'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [search, addToast]);

  const projects = library.projects;
  const clips = library.clips;

  const TABS: { id: LibTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'all', label: 'All Content', icon: <Folder className="w-3.5 h-3.5" />, count: projects.length + clips.length },
    { id: 'projects', label: 'Projects & Ingests', icon: <Film className="w-3.5 h-3.5" />, count: projects.length },
    { id: 'clips', label: 'AI Generated Clips', icon: <Scissors className="w-3.5 h-3.5" />, count: clips.length },
    { id: 'captions', label: 'Captions & Posts', icon: <FileText className="w-3.5 h-3.5" />, count: 24 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {loading && <div className="card p-5 text-sm text-secondary">Loading content library…</div>}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary">Content Library</h1>
          <p className="text-secondary text-sm mt-1">
            Searchable repository of all raw media uploads, transcripts, extracted clips, and drafted captions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-elevated border border-border rounded-lg p-1">
            <button
              onClick={() => setGridMode('list')}
              className={cn('p-1.5 rounded transition-colors', gridMode === 'list' ? 'bg-accent/20 text-accent' : 'text-secondary hover:text-primary')}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridMode('grid')}
              className={cn('p-1.5 rounded transition-colors', gridMode === 'grid' ? 'bg-accent/20 text-accent' : 'text-secondary hover:text-primary')}
              title="Grid view"
            >
              <Grid2x2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => navigate('/studio')}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Ingest Media
          </button>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input
            className="input pl-9 text-xs"
            placeholder="Search titles, transcripts, tags, languages…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs text-secondary hover:text-primary">
              Clear
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex gap-1 p-1 bg-elevated border border-border rounded-xl overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                tab === t.id ? 'bg-accent/20 text-accent font-semibold' : 'text-secondary hover:text-primary'
              )}
            >
              {t.icon}
              {t.label}
              <span className={cn('rounded-full px-1.5 text-2xs font-mono', tab === t.id ? 'bg-accent/30 text-accent' : 'bg-surface text-tertiary')}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Projects Section */}
      {(tab === 'all' || tab === 'projects') && (
        <section className="space-y-3">
          {tab === 'all' && (
            <div className="flex items-center justify-between">
              <h2 className="section-title">Ingested Projects ({projects.length})</h2>
              <button onClick={() => setTab('projects')} className="text-2xs text-accent hover:underline">
                View all projects
              </button>
            </div>
          )}

          {projects.length === 0 ? (
            <EmptyState
              icon={<Film className="w-7 h-7" />}
              title="No media projects found"
              description={search ? `No projects match "${search}". Try another query.` : 'Upload your first audio or video episode.'}
              action={<button onClick={() => navigate('/studio')} className="btn-primary text-xs">Upload Media</button>}
            />
          ) : (
            <div className={cn(gridMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2')}>
              {projects.map(project => (
                gridMode === 'grid' ? (
                  <div
                    key={project.id}
                    onClick={() => navigate('/studio')}
                    className="card-hover overflow-hidden flex flex-col justify-between"
                  >
                    <div
                      className="h-28 flex items-center justify-center relative cursor-pointer"
                      style={{ background: `hsl(${project.id.charCodeAt(1) * 40}, 25%, 15%)` }}
                    >
                      <Play className="w-8 h-8 text-white/40" />
                      <div className="absolute top-2 right-2">
                        <span className="badge bg-black/60 text-white font-mono text-2xs">{project.duration}</span>
                      </div>
                    </div>
                    <div className="p-3.5 space-y-2">
                      <p className="text-xs font-semibold text-primary line-clamp-1">{project.title}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`badge ${getStatusColor(project.status)} text-2xs`}>{getStatusLabel(project.status)}</span>
                        <span className="badge-accent badge text-2xs">{project.language}</span>
                      </div>
                      <p className="text-2xs text-tertiary">{getRelativeTime(project.uploadedAt)} · {project.clipsGenerated} clips extracted</p>
                    </div>
                  </div>
                ) : (
                  <div
                    key={project.id}
                    onClick={() => navigate('/studio')}
                    className="card-hover p-4 flex items-center gap-4 cursor-pointer"
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `hsl(${project.id.charCodeAt(1) * 40}, 25%, 15%)` }}
                    >
                      <Play className="w-5 h-5 text-white/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{project.title}</p>
                      <div className="flex items-center gap-3 text-2xs text-tertiary mt-0.5">
                        <span className="font-mono">{project.duration}</span>
                        <span>{getRelativeTime(project.uploadedAt)}</span>
                        <span className="badge-accent badge">{project.language}</span>
                        {project.clipsGenerated > 0 && (
                          <span className="text-emerald font-semibold">{project.clipsGenerated} clips</span>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:flex gap-1">
                      {project.platform.slice(0, 3).map(p => <PlatformBadge key={p} platform={p} />)}
                    </div>
                    <span className={`badge ${getStatusColor(project.status)} text-2xs`}>{getStatusLabel(project.status)}</span>
                    <ArrowRight className="w-4 h-4 text-tertiary" />
                  </div>
                )
              ))}
            </div>
          )}
        </section>
      )}

      {/* Clips Section */}
      {(tab === 'all' || tab === 'clips') && (
        <section className="space-y-3 pt-2">
          {tab === 'all' && (
            <div className="flex items-center justify-between">
              <h2 className="section-title">AI Clip Candidates ({clips.length})</h2>
              <button onClick={() => setTab('clips')} className="text-2xs text-accent hover:underline">
                View all clips
              </button>
            </div>
          )}

          <div className="space-y-2">
            {clips.map(clip => (
              <div
                key={clip.id}
                onClick={() => navigate('/clips')}
                className="card-hover p-4 flex items-center gap-4 cursor-pointer"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: clip.thumbnailColor }}
                >
                  <Play className="w-5 h-5 text-white/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-primary truncate">{clip.title}</p>
                    <span className="badge-success text-2xs font-semibold">{clip.engagementPotential}% Potential</span>
                  </div>
                  <p className="text-2xs text-secondary mt-0.5 line-clamp-1">"{clip.transcript}"</p>
                  <div className="flex items-center gap-2 text-2xs text-tertiary mt-0.5 font-mono">
                    <span>{clip.startTime} → {clip.endTime}</span>
                    <span>·</span>
                    <span>{clip.duration}</span>
                  </div>
                </div>
                <div className="hidden md:flex gap-1">
                  {clip.platforms.slice(0, 2).map(p => <PlatformBadge key={p} platform={p} />)}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/editor');
                  }}
                  className="btn-secondary !p-2 text-xs"
                  title="Open in Video Editor"
                >
                  <Scissors className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Captions Archive */}
      {tab === 'captions' && (
        <EmptyState
          icon={<FileText className="w-7 h-7 text-accent" />}
          title="24 Generated Captions & Posts in Archive"
          description="Access, edit, and regenerate platform-specific copies inside Content Studio."
          action={
            <button
              className="btn-primary text-xs flex items-center gap-1.5"
              onClick={() => navigate('/content')}
            >
              Open Content Studio <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        />
      )}
    </div>
  );
}
