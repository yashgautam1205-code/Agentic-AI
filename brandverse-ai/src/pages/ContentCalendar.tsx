import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Clock, Check, Edit3, Grid3x3, Filter, MessageSquare,
  Users, CheckCircle2, AlertCircle, X, Trash2, CalendarDays
} from 'lucide-react';
import { api } from '../lib/api';
import { PlatformBadge } from '../components/ui/UIKit';
import { getStatusColor, getStatusLabel, cn } from '../lib/utils';
import { useToast } from '../contexts/ToastContext';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

type ViewMode = 'week' | 'month';
type PlatformFilter = 'all' | 'instagram' | 'youtube' | 'linkedin' | 'x';
type StatusFilter = 'all' | 'approved' | 'draft' | 'pending_review';

interface PostItem {
  id: string;
  clipId: string;
  platform: string;
  scheduledAt: string;
  status: string;
  title: string;
  reviewComment?: string;
}

export function ContentCalendar() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date('2026-11-22'));
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [posts, setPosts] = useState<PostItem[]>([]);

  // Modals state
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [reviewPost, setReviewPost] = useState<PostItem | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newPlatform, setNewPlatform] = useState('instagram');
  const [newDateTime, setNewDateTime] = useState('2026-11-25T14:00:00');
  const [reviewCommentInput, setReviewCommentInput] = useState('');

  const { addToast } = useToast();

  useEffect(() => {
    let active = true;
    api.getCalendar()
      .then((data) => {
        if (!active) return;
        setPosts((data as Array<Record<string, unknown>>).map(record => ({
          id: String(record.id),
          clipId: String(record.clip_id || ''),
          platform: String(record.platform),
          scheduledAt: String(record.scheduled_at),
          status: String(record.status),
          title: String(record.title),
          reviewComment: record.reviewer_comment ? String(record.reviewer_comment) : undefined,
        })));
      })
      .catch((error) => addToast(error instanceof Error ? error.message : 'Failed to load calendar.', 'error'));
    return () => { active = false; };
  }, [addToast]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Month days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const filteredPosts = posts.filter(p => {
    const matchPlat = platformFilter === 'all' || p.platform === platformFilter;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchPlat && matchStatus;
  });

  const getPostsForDay = (day: Date) => {
    return filteredPosts.filter(p => isSameDay(parseISO(p.scheduledAt), day));
  };

  const getTimeStr = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'h:mm a');
    } catch {
      return '10:00 AM';
    }
  };

  const handleApprove = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    api.approveCalendarPost(id)
      .then(() => {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p));
        addToast('Post marked as approved.', 'success');
      })
      .catch(error => addToast(error instanceof Error ? error.message : 'Approval failed.', 'error'));
  };

  const handleDeletePost = (id: string) => {
    api.deleteCalendarPost(id)
      .then(() => {
        setPosts(prev => prev.filter(p => p.id !== id));
        addToast('Post removed from calendar.', 'info');
      })
      .catch(error => addToast(error instanceof Error ? error.message : 'Delete failed.', 'error'));
  };

  const handleSaveEdit = () => {
    if (!editingPost) return;
    api.updateCalendarPost(editingPost.id, {
      title: editingPost.title,
      platform: editingPost.platform,
      scheduled_at: editingPost.scheduledAt,
      status: editingPost.status,
      reviewer_comment: editingPost.reviewComment,
    })
      .then(() => {
        setPosts(prev => prev.map(p => p.id === editingPost.id ? editingPost : p));
        setEditingPost(null);
        addToast('Post schedule updated.', 'success');
      })
      .catch(error => addToast(error instanceof Error ? error.message : 'Update failed.', 'error'));
  };

  const handleCreatePost = () => {
    if (!newTitle.trim()) {
      addToast('Please enter a post title', 'warning');
      return;
    }
    api.createCalendarPost({
      title: newTitle.trim(),
      platform: newPlatform,
      scheduled_at: newDateTime,
    })
      .then((data) => {
        const record = data as Record<string, unknown>;
        setPosts(prev => [{
          id: String(record.id),
          clipId: String(record.clip_id || ''),
          platform: String(record.platform),
          scheduledAt: String(record.scheduled_at),
          status: String(record.status),
          title: String(record.title),
        }, ...prev]);
        setIsScheduleOpen(false);
        setNewTitle('');
        addToast('Post scheduled in the database.', 'success');
      })
      .catch(error => addToast(error instanceof Error ? error.message : 'Schedule failed.', 'error'));
  };

  const handleAddReviewComment = () => {
    if (!reviewPost) return;
    api.reviewCalendarPost(reviewPost.id, reviewCommentInput)
      .then(() => {
        setPosts(prev => prev.map(p => p.id === reviewPost.id ? { ...p, reviewComment: reviewCommentInput, status: 'pending_review' } : p));
        setReviewPost(null);
        setReviewCommentInput('');
        addToast('Review feedback saved.', 'success');
      })
      .catch(error => addToast(error instanceof Error ? error.message : 'Review update failed.', 'error'));
  };

  const statusColors: Record<string, string> = {
    approved: 'border-l-emerald bg-emerald/5',
    draft: 'border-l-violet bg-violet/5',
    pending_review: 'border-l-amber bg-amber/5',
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary">Content Calendar & Review</h1>
          <p className="text-secondary text-sm mt-1">
            Weekly and monthly scheduling grid with approval workflows and team feedback.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode */}
          <div className="flex items-center gap-1 bg-elevated border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5',
                viewMode === 'week' ? 'bg-accent/20 text-accent font-semibold' : 'text-secondary hover:text-primary'
              )}
            >
              <Grid3x3 className="w-3.5 h-3.5" /> Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5',
                viewMode === 'month' ? 'bg-accent/20 text-accent font-semibold' : 'text-secondary hover:text-primary'
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Month
            </button>
          </div>

          <button
            onClick={() => setIsScheduleOpen(true)}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Schedule Post
          </button>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Platforms */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'instagram', 'youtube', 'linkedin', 'x'] as PlatformFilter[]).map(p => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                platformFilter === p ? 'bg-accent/20 text-accent border border-accent/40 font-semibold' : 'btn-secondary text-secondary'
              )}
            >
              {p === 'all' ? 'All Platforms' : p}
            </button>
          ))}
        </div>

        {/* Status Filters & Collaboration */}
        <div className="flex items-center gap-2">
          <span className="text-2xs text-secondary hidden sm:inline">Status:</span>
          {(['all', 'approved', 'draft', 'pending_review'] as StatusFilter[]).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                'px-2.5 py-1 rounded-md text-2xs font-medium transition-all capitalize',
                statusFilter === st ? 'bg-surface border border-accent text-accent font-semibold' : 'text-secondary hover:text-primary'
              )}
            >
              {st === 'pending_review' ? 'Needs Review' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(d => addDays(d, viewMode === 'week' ? -7 : -30))} className="btn-secondary !p-2">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-display font-bold text-base text-primary">
            {viewMode === 'week' ? (
              `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
            ) : (
              format(currentDate, 'MMMM yyyy')
            )}
          </h2>
          <button onClick={() => setCurrentDate(d => addDays(d, viewMode === 'week' ? 7 : 30))} className="btn-secondary !p-2">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button onClick={() => setCurrentDate(new Date('2026-11-22'))} className="btn-ghost text-xs">
          Jump to Today
        </button>
      </div>

      {/* Weekly View Grid */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {weekDays.map(day => {
            const dayPosts = getPostsForDay(day);
            const isToday = isSameDay(day, new Date('2026-11-22'));

            return (
              <div
                key={day.toString()}
                className={cn(
                  'min-h-[220px] rounded-xl p-3 border flex flex-col justify-between transition-colors',
                  isToday ? 'border-accent/50 bg-accent/5' : 'border-border bg-elevated/40'
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xs font-semibold uppercase tracking-wider text-secondary">
                      {format(day, 'EEE')}
                    </span>
                    <span className={cn('text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center', isToday ? 'bg-accent text-white' : 'text-primary')}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Day Posts List */}
                  <div className="space-y-2">
                    {dayPosts.map(post => (
                      <div
                        key={post.id}
                        onClick={() => setEditingPost(post)}
                        className={cn(
                          'rounded-lg p-2.5 border-l-2 cursor-pointer hover:bg-elevated transition-all border shadow-sm group',
                          statusColors[post.status] ?? 'border-l-border bg-surface'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <PlatformBadge platform={post.platform} />
                          <span className="text-2xs text-tertiary font-mono">{getTimeStr(post.scheduledAt)}</span>
                        </div>
                        <p className="text-xs font-medium text-primary line-clamp-2 leading-tight">
                          {post.title}
                        </p>
                        {post.reviewComment && (
                          <div className="mt-1 flex items-center gap-1 text-2xs text-amber">
                            <MessageSquare className="w-2.5 h-2.5" /> Note attached
                          </div>
                        )}
                      </div>
                    ))}

                    {dayPosts.length === 0 && (
                      <div className="py-6 text-center text-2xs text-tertiary">
                        No posts scheduled
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setNewDateTime(`${format(day, 'yyyy-MM-dd')}T10:00:00`);
                    setIsScheduleOpen(true);
                  }}
                  className="w-full text-center text-2xs text-tertiary hover:text-accent py-1 mt-2 border border-dashed border-border/60 rounded hover:border-accent/40 transition-colors"
                >
                  + Add Post
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Month View Grid */}
      {viewMode === 'month' && (
        <div className="card p-4">
          <div className="grid grid-cols-7 gap-2 text-center pb-2 border-b border-border text-2xs font-semibold text-secondary">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 pt-2">
            {monthDays.map(day => {
              const dayPosts = getPostsForDay(day);
              const isToday = isSameDay(day, new Date('2026-11-22'));

              return (
                <div
                  key={day.toString()}
                  onClick={() => {
                    setNewDateTime(`${format(day, 'yyyy-MM-dd')}T10:00:00`);
                    setIsScheduleOpen(true);
                  }}
                  className={cn(
                    'min-h-[75px] p-1.5 rounded-lg border text-left cursor-pointer transition-colors flex flex-col justify-between hover:border-accent/40',
                    isToday ? 'border-accent bg-accent/5' : 'border-border/60 bg-surface/50'
                  )}
                >
                  <span className={cn('text-2xs font-bold', isToday ? 'text-accent' : 'text-secondary')}>
                    {format(day, 'd')}
                  </span>
                  <div className="space-y-1 mt-1">
                    {dayPosts.map(p => (
                      <div
                        key={p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPost(p);
                        }}
                        className="text-2xs bg-elevated px-1 py-0.5 rounded truncate text-primary border border-border/80"
                      >
                        {p.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scheduled Posts Detailed List & Collaboration Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Scheduled Posts ({filteredPosts.length})</h2>
          <div className="flex items-center gap-3 text-2xs text-secondary">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald" /> Approved</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet" /> Draft</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber" /> Needs Review</span>
          </div>
        </div>

        <div className="space-y-2">
          {filteredPosts.map(post => (
            <div
              key={post.id}
              className="card-hover p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <PlatformBadge platform={post.platform} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary">{post.title}</p>
                  <p className="text-2xs text-secondary mt-0.5 flex items-center gap-2">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(post.scheduledAt), 'EEE, MMM d, yyyy · h:mm a')}</span>
                    {post.reviewComment && (
                      <span className="text-amber">Reviewer Note: "{post.reviewComment}"</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className={`badge ${getStatusColor(post.status)}`}>
                  {getStatusLabel(post.status)}
                </span>

                {post.status !== 'approved' && (
                  <button
                    onClick={(e) => handleApprove(post.id, e)}
                    className="btn-secondary !p-1.5 text-emerald hover:border-emerald/40"
                    title="Approve for auto-posting"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => {
                    setReviewPost(post);
                    setReviewCommentInput(post.reviewComment ?? '');
                  }}
                  className="btn-secondary !p-1.5 text-secondary hover:text-accent"
                  title="Add collaboration review feedback"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setEditingPost(post)}
                  className="btn-secondary !p-1.5 text-secondary hover:text-primary"
                  title="Edit post"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="btn-secondary !p-1.5 text-tertiary hover:text-rose"
                  title="Delete post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Post Modal */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-elevated border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-elevated"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-display font-semibold text-base text-primary">Edit Scheduled Post</h3>
                <button onClick={() => setEditingPost(null)} className="text-secondary hover:text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="label mb-1 block">Post Title</label>
                  <input
                    className="input text-xs"
                    value={editingPost.title}
                    onChange={e => setEditingPost({ ...editingPost, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label mb-1 block">Platform</label>
                  <select
                    className="input text-xs"
                    value={editingPost.platform}
                    onChange={e => setEditingPost({ ...editingPost, platform: e.target.value })}
                  >
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube Shorts</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="x">X (Twitter)</option>
                  </select>
                </div>

                <div>
                  <label className="label mb-1 block">Schedule Timestamp</label>
                  <input
                    type="datetime-local"
                    className="input text-xs"
                    value={editingPost.scheduledAt.slice(0, 16)}
                    onChange={e => setEditingPost({ ...editingPost, scheduledAt: `${e.target.value}:00` })}
                  />
                </div>

                <div>
                  <label className="label mb-1 block">Status</label>
                  <select
                    className="input text-xs"
                    value={editingPost.status}
                    onChange={e => setEditingPost({ ...editingPost, status: e.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button onClick={() => setEditingPost(null)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button onClick={handleSaveEdit} className="btn-primary text-xs">
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Post Modal */}
      <AnimatePresence>
        {isScheduleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-elevated border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-elevated"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-display font-semibold text-base text-primary">New Scheduled Post</h3>
                <button onClick={() => setIsScheduleOpen(false)} className="text-secondary hover:text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="label mb-1 block">Title / Concept</label>
                  <input
                    className="input text-xs"
                    placeholder="e.g., The 5 Irreplaceable Skills in AI"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label mb-1 block">Platform</label>
                  <select
                    className="input text-xs"
                    value={newPlatform}
                    onChange={e => setNewPlatform(e.target.value)}
                  >
                    <option value="instagram">Instagram Reels</option>
                    <option value="youtube">YouTube Shorts</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="x">X (Twitter)</option>
                  </select>
                </div>

                <div>
                  <label className="label mb-1 block">Date & Time</label>
                  <input
                    type="datetime-local"
                    className="input text-xs"
                    value={newDateTime.slice(0, 16)}
                    onChange={e => setNewDateTime(`${e.target.value}:00`)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button onClick={() => setIsScheduleOpen(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button onClick={handleCreatePost} className="btn-primary text-xs">
                  Add to Calendar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Collaboration Review Modal */}
      <AnimatePresence>
        {reviewPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-elevated border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-elevated"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-display font-semibold text-base text-primary flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent" />
                  Team Collaboration & Review
                </h3>
                <button onClick={() => setReviewPost(null)} className="text-secondary hover:text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-surface border border-border text-xs">
                  <p className="font-semibold text-primary">{reviewPost.title}</p>
                  <p className="text-2xs text-secondary mt-0.5">Platform: {reviewPost.platform}</p>
                </div>

                <div>
                  <label className="label mb-1 block">Review Feedback / Change Requests</label>
                  <textarea
                    rows={4}
                    className="input text-xs"
                    placeholder="e.g. Ensure the opening hook doesn't give away the punchline too fast..."
                    value={reviewCommentInput}
                    onChange={e => setReviewCommentInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button onClick={() => setReviewPost(null)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button onClick={handleAddReviewComment} className="btn-primary text-xs">
                  Save Review Note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
