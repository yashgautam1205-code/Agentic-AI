import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload, Film, Scissors, TrendingUp, Calendar, Zap,
  ArrowRight, Clock, CheckCircle2, Play, Layers, Brain, Eye, Heart, Share2
} from 'lucide-react';
import { CURRENT_USER } from '../data/mockData';
import { formatNumber, getRelativeTime, getStatusColor, getStatusLabel } from '../lib/utils';
import { PlatformBadge, DemoBadge } from '../components/ui/UIKit';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '../lib/api';

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="text-xs text-secondary">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent ?? 'bg-accent/10 text-accent'}`}>
          {icon}
        </div>
      </div>
      <span className="font-display font-bold text-2xl text-primary">{value}</span>
      {sub && <span className="text-2xs text-tertiary">{sub}</span>}
    </div>
  );
}

export function CommandCenter() {
  const [library, setLibrary] = useState<Record<string, unknown>>({});
  const [analytics, setAnalytics] = useState<Record<string, unknown>>({});
  const [clips, setClips] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    let active = true;
    Promise.all([api.getLibrary(), api.getAnalytics(), api.listClips()])
      .then(([libraryData, analyticsData, clipsData]) => {
        if (!active) return;
        setLibrary(libraryData as Record<string, unknown>);
        setAnalytics(analyticsData as Record<string, unknown>);
        setClips(clipsData as Array<Record<string, unknown>>);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const weeklyData = Array.isArray(analytics.weekly) ? analytics.weekly as Array<{day:string;views:number;engagement:number;shares:number}> : [];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-elevated via-elevated to-accent/5 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-secondary mb-1">{greeting}, {CURRENT_USER.name.split(' ')[0]} 👋</p>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-primary">
                Your creative universe
                <span className="gradient-text"> awaits.</span>
              </h1>
              <p className="text-sm text-secondary mt-1">One source. Infinite stories. Your voice.</p>
            </div>
            <Link to="/studio">
              <button className="btn-primary flex items-center gap-2 text-sm">
                <Upload className="w-4 h-4" />
                Upload New Content
              </button>
            </Link>
          </div>

          {/* Quick stats inline */}
          <div className="flex flex-wrap gap-6 mt-5">
            {[
              { label: 'Total Media', value: Number((library.counts as {projects?: number}|undefined)?.projects || 0) },
              { label: 'Clips Created', value: Number((library.counts as {clips?: number}|undefined)?.clips || 0) },
              { label: 'Scheduled', value: Number((analytics.total_scheduled as number) || 0) },
              { label: 'Total Views', value: formatNumber(Number(analytics.total_views || 0)) },
            ].map(s => (
              <div key={s.label} className="flex flex-col">
                <span className="font-display font-bold text-xl text-primary">{s.value}</span>
                <span className="text-2xs text-tertiary">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Film className="w-4 h-4" />} label="Total Media" value={String((library.counts as {projects?: number}|undefined)?.projects || 0)} sub="Persistent uploads" />
        <StatCard icon={<Scissors className="w-4 h-4" />} label="Clips Generated" value={String((library.counts as {clips?: number}|undefined)?.clips || 0)} sub="From transcripts" accent="bg-violet/10 text-violet" />
        <StatCard icon={<Calendar className="w-4 h-4" />} label="Scheduled Posts" value={String((analytics.total_scheduled as number) || 0)} sub="Calendar records" accent="bg-cyan/10 text-cyan" />
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Avg Engagement" value={`${Number(analytics.avg_engagement || 0)}%`} sub="Recorded telemetry" accent="bg-emerald/10 text-emerald" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Recent Projects</h2>
            <Link to="/library" className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {((library.projects as Array<{id:string;title:string;type:string;duration:string;status:string;uploadedAt:string;clipsGenerated:number;language:string;platform:string[]}>) || []).slice(0, 4).map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-hover p-4 flex items-center gap-4"
              >
                {/* Thumbnail placeholder */}
                <div
                  className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center"
                  style={{ background: `hsl(${i * 50 + 200}, 30%, 20%)` }}
                >
                  {project.type === 'podcast' ? (
                    <div className="w-6 h-4 flex gap-0.5 items-end">
                      {[4, 7, 5, 8, 4].map((h, j) => (
                        <div key={j} className="flex-1 rounded-full bg-accent/60" style={{ height: h }} />
                      ))}
                    </div>
                  ) : (
                    <Play className="w-5 h-5 text-accent/70" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-primary truncate">{project.title}</p>
                    <span className={`badge ${getStatusColor(project.status)} text-2xs`}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-2xs text-tertiary">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{project.duration}</span>
                    <span>{getRelativeTime(project.uploadedAt)}</span>
                    {project.clipsGenerated > 0 && <span className="text-accent">{project.clipsGenerated} clips</span>}
                    <span className="badge-accent badge">{project.language}</span>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {project.platform.slice(0, 3).map(p => <PlatformBadge key={p} platform={p} />)}
                  </div>
                </div>
                <Link to="/clips" className="text-tertiary hover:text-accent transition-colors flex-shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Engagement chart */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-primary">Weekly Engagement</h3>
              <DemoBadge />
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B7FFF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5B7FFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="engagement" stroke="#5B7FFF" fill="url(#engGrad)" strokeWidth={2} dot={false} />
                <Tooltip
                  contentStyle={{ background: '#1A2235', border: '1px solid #1F2D45', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#8B9FC2' }}
                  itemStyle={{ color: '#5B7FFF' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* AI Recommendations */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-primary">AI Recommendations</h3>
            </div>
            <div className="space-y-3">
              {(Array.isArray(analytics.ai_recommendations) ? analytics.ai_recommendations as string[] : []).slice(0, 3).map((rec, i) => (
                <div key={i} className="flex gap-2.5 text-xs text-secondary">
                  <div className="w-1 h-1 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <p>{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top clip */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-primary mb-3">Top Clip Candidate</h3>
            {clips[0] && (
              <div>
                <div className="h-20 rounded-lg flex items-center justify-center mb-3" style={{ background: String(clips[0].thumbnail_color || '#1a2a4a') }}>
                  <Play className="w-6 h-6 text-white/40" />
                </div>
                <p className="text-sm font-medium text-primary mb-1">{String(clips[0].title)}</p>
                <p className="text-2xs text-secondary mb-2 line-clamp-2">{String(clips[0].transcript_excerpt)}</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xs text-tertiary">{String(clips[0].duration_display || clips[0].duration_seconds)}</span>
                  <span className="text-2xs font-medium text-emerald">{String(clips[0].engagement_potential)}% potential</span>
                </div>
                <Link to="/clips">
                  <button className="btn-secondary w-full mt-3 text-xs">View All Clips</button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workflow discovery strip */}
      <div>
        <h2 className="section-title mb-4">Six Core Workflows</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Ingest Content', icon: Upload, to: '/studio', desc: 'Upload video or podcast', color: 'bg-accent/10 text-accent' },
            { label: 'Select Clips', icon: Scissors, to: '/clips', desc: 'AI clip intelligence', color: 'bg-violet/10 text-violet' },
            { label: 'Generate Content', icon: Layers, to: '/content', desc: 'Platform-ready posts', color: 'bg-cyan/10 text-cyan' },
            { label: 'Train Memory', icon: Brain, to: '/memory', desc: 'Brand voice learning', color: 'bg-amber/10 text-amber' },
            { label: 'Schedule', icon: Calendar, to: '/calendar', desc: 'Plan your calendar', color: 'bg-emerald/10 text-emerald' },
            { label: 'Analyze', icon: TrendingUp, to: '/analytics', desc: 'Performance feedback', color: 'bg-rose/10 text-rose' },
          ].map(w => {
            const Icon = w.icon;
            return (
              <Link key={w.to} to={w.to}>
                <div className="card-hover p-3 text-center space-y-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto ${w.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-primary">{w.label}</p>
                  <p className="text-2xs text-tertiary">{w.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
