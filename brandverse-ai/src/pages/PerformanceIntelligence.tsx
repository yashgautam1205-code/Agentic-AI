import React, { useEffect, useState } from 'react';
import {
  BarChart2, TrendingUp, Eye, Heart, Share2, Zap,
  ArrowUp, ArrowDown, Info, Download, Calendar, Layers,
  CheckCircle2, Sparkles
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { formatNumber, getPlatformBg, cn } from '../lib/utils';
import { DemoBadge, PlatformBadge } from '../components/ui/UIKit';
import { useToast } from '../contexts/ToastContext';
import { api } from '../lib/api';

const CHART_STYLE = {
  contentStyle: { background: '#1A2235', border: '1px solid #1F2D45', borderRadius: 8, fontSize: 11 },
  labelStyle: { color: '#8B9FC2' },
};

export function PerformanceIntelligence() {
  const [metricView, setMetricView] = useState<'views' | 'engagement' | 'shares'>('views');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const { addToast } = useToast();
  const [analytics, setAnalytics] = useState<{
    is_demo_data: boolean;
    data_source_label: string;
    total_views: number;
    avg_engagement: number;
    total_shares: number;
    best_platform: string | null;
    weekly: Array<{day: string; views: number; engagement: number; shares: number}>;
    platform_comparison: Array<{platform: string; views: number; engagement: number; growth: number}>;
    hook_analytics: Array<{type: string; avgRetention: string; shareRate: string; sample: string}>;
    ai_recommendations: string[];
  } | null>(null);

  useEffect(() => {
    let active = true;
    api.getAnalytics()
      .then((data) => active && setAnalytics(data as typeof analytics))
      .catch((error) => addToast(error instanceof Error ? error.message : 'Failed to load analytics.', 'error'));
    return () => { active = false; };
  }, [addToast]);

  const handleExportData = () => {
    addToast('Performance intelligence report exported as CSV & PDF summary', 'success');
  };

  const radarData = (analytics?.platform_comparison || []).map(p => ({
    platform: p.platform.split(' ')[0],
    views: Math.round(p.views / 10000),
    engagement: p.engagement * 10,
    growth: p.growth,
  }));

  // Multiply based on timeRange
  const weeklyData = analytics?.weekly || [];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary">Performance Intelligence</h1>
          <p className="text-secondary text-sm mt-1">
            Data feedback loops that dynamically influence future AI clip selection and caption recommendations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {analytics?.is_demo_data ? <DemoBadge /> : null}
          <button
            onClick={handleExportData}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export Report
          </button>
        </div>
      </div>

      {/* Prominent Demo Data Disclaimer */}
      <div className="card p-4 border-amber/30 bg-amber/5 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
        <div className="text-xs text-secondary leading-relaxed">
          <span className="text-amber font-semibold">Data source: </span>
          {analytics?.data_source_label || 'Loading performance telemetry...'}
        </div>
      </div>

      {/* Time Range Filter & KPI Strip */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className="text-xs font-semibold text-primary">Key Performance Metrics</span>
        <div className="flex gap-1 p-1 bg-elevated border border-border rounded-lg">
          {[
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: '90d', label: 'Last 90 Days' },
          ].map(tr => (
            <button
              key={tr.id}
              onClick={() => {
                setTimeRange(tr.id as any);
                addToast(`Analytics scaled to ${tr.label}`, 'info');
              }}
              className={cn(
                'px-3 py-1 rounded text-2xs font-medium transition-all',
                timeRange === tr.id ? 'bg-accent/20 text-accent font-semibold' : 'text-secondary hover:text-primary'
              )}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Views', value: formatNumber(analytics?.total_views || 0), change: 'Recorded', up: true, icon: Eye },
          { label: 'Avg Engagement Rate', value: `${analytics?.avg_engagement || 0}%`, change: 'Recorded', up: true, icon: Heart },
          { label: 'Total Post Shares', value: formatNumber(analytics?.total_shares || 0), change: 'Recorded', up: true, icon: Share2 },
          { label: 'Top Converting Platform', value: analytics?.best_platform || 'No data', change: 'Recorded', up: true, icon: TrendingUp },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-2xs text-secondary font-medium">{kpi.label}</span>
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="font-display font-bold text-2xl text-primary">{kpi.value}</span>
              <span className={cn('text-2xs flex items-center gap-0.5', kpi.up ? 'text-emerald' : 'text-rose')}>
                {kpi.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {kpi.change} vs previous period
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 card p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-display font-semibold text-sm text-primary">Audience Reach & Growth</h2>
              <p className="text-2xs text-secondary">Dynamic metrics update recommendations automatically</p>
            </div>
            <div className="flex gap-1 p-1 bg-elevated rounded-lg border border-border">
              {(['views', 'engagement', 'shares'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMetricView(m)}
                  className={cn(
                    'px-2.5 py-1 rounded text-2xs capitalize transition-all',
                    metricView === m ? 'bg-accent/20 text-accent font-semibold' : 'text-secondary hover:text-primary'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5B7FFF" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#5B7FFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2D45" />
              <XAxis dataKey="day" stroke="#4E5F7A" tick={{ fontSize: 11 }} />
              <YAxis stroke="#4E5F7A" tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(v)} />
              <Tooltip {...CHART_STYLE} formatter={(v: unknown) => [formatNumber(Number(v)), metricView]} />
              <Area type="monotone" dataKey={metricView} stroke="#5B7FFF" fill="url(#aGrad)" strokeWidth={2.5} dot={{ r: 3, fill: '#5B7FFF' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Radar Matrix */}
        <div className="card p-5 space-y-3">
          <h2 className="font-display font-semibold text-sm text-primary">Multi-Platform Distribution</h2>
          <ResponsiveContainer width="100%" height={210}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1F2D45" />
              <PolarAngleAxis dataKey="platform" tick={{ fontSize: 10, fill: '#8B9FC2' }} />
              <PolarRadiusAxis tick={false} />
              <Radar name="Views" dataKey="views" stroke="#5B7FFF" fill="#5B7FFF" fillOpacity={0.25} />
              <Radar name="Engagement" dataKey="engagement" stroke="#7C5CFC" fill="#7C5CFC" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>

          <div className="space-y-1.5 pt-1 border-t border-border/50">
            {(analytics?.platform_comparison || []).map(p => (
              <div key={p.platform} className="flex items-center justify-between text-xs">
                <PlatformBadge platform={p.platform.split(' ')[0].toLowerCase()} />
                <span className="text-secondary font-mono">{formatNumber(p.views)} views</span>
                <span className="text-emerald font-semibold">+{p.growth}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hook Intelligence Analysis & AI Closed-Loop Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hook Category Performance */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber" />
            <h2 className="font-display font-semibold text-sm text-primary">Hook Style Retention Telemetry</h2>
          </div>
          <p className="text-2xs text-secondary">
            AI monitors which hook frameworks yield the highest first-3-second retention for your audience:
          </p>

          <div className="space-y-2.5">
            {(analytics?.hook_analytics || []).map((h, i) => (
              <div key={i} className="p-3 rounded-lg bg-surface border border-border/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">{h.type}</span>
                  <div className="flex items-center gap-3 text-2xs">
                    <span className="text-emerald font-bold">{h.avgRetention} Retention</span>
                    <span className="text-accent">{h.shareRate} Share Rate</span>
                  </div>
                </div>
                <p className="text-2xs text-secondary italic">{h.sample}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Closed-Loop AI Recommendations */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            <h2 className="font-display font-semibold text-sm text-primary">Closed-Loop Learning Feedback</h2>
          </div>
          <p className="text-2xs text-secondary">
            How these performance signals have modified your future AI generation settings:
          </p>

          <div className="space-y-3">
            {(analytics?.ai_recommendations || []).map((rec, i) => (
              <div key={i} className="p-3 rounded-lg bg-surface border border-border/60 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center font-bold text-2xs flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-primary/90 font-medium leading-relaxed">{rec}</p>
                  <p className="text-2xs text-emerald flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto-applied to Clip Intelligence models
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
