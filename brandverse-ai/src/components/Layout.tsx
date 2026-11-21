import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Film, Scissors, Layers, Brain, Calendar,
  BarChart2, Video, Library, Settings, ChevronLeft, ChevronRight,
  Upload, Bell, Search, Sun, Moon, Menu, X, CheckCircle2,
  Clock, Sparkles, Check, Trash2
} from 'lucide-react';
import { BrandLogo } from './brand/BrandLogo';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { CURRENT_USER } from '../data/mockData';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { path: '/', label: 'Command Center', icon: LayoutDashboard },
  { path: '/studio', label: 'Media Studio', icon: Film },
  { path: '/clips', label: 'AI Clip Intelligence', icon: Scissors },
  { path: '/content', label: 'Content Studio', icon: Layers },
  { path: '/memory', label: 'Creator Memory', icon: Brain },
  { path: '/calendar', label: 'Content Calendar', icon: Calendar },
  { path: '/analytics', label: 'Performance', icon: BarChart2 },
  { path: '/editor', label: 'Video Editor', icon: Video },
  { path: '/library', label: 'Content Library', icon: Library },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface NotificationItem {
  id: string;
  title: string;
  time: string;
  read: boolean;
  type: 'clip' | 'calendar' | 'memory' | 'analytics';
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', title: '14 AI Clips ready for "AI Future of Work"', time: '12m ago', read: false, type: 'clip' },
  { id: 'n2', title: 'Post scheduled for Instagram Reels tomorrow at 9 AM', time: '1h ago', read: false, type: 'calendar' },
  { id: 'n3', title: 'Brand Memory updated: learned 3 new phrasing preferences', time: '3h ago', read: true, type: 'memory' },
  { id: 'n4', title: 'Weekly performance report: +18% view growth', time: '1d ago', read: true, type: 'analytics' },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const notificationRef = useRef<HTMLDivElement>(null);

  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPage = NAV_ITEMS.find(n => n.path === location.pathname)?.label ?? 'BRANDVERSE AI';
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/library?q=${encodeURIComponent(searchQuery.trim())}`);
      addToast(`Searching library for "${searchQuery.trim()}"`, 'info');
    }
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    addToast('All notifications marked as read', 'info');
  };

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
    addToast('Notifications cleared', 'info');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-void">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 220 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className={cn(
          'hidden md:flex flex-col flex-shrink-0 h-full bg-surface border-r border-border relative z-30',
          'overflow-hidden'
        )}
      >
        {/* Logo */}
        <div className="flex items-center px-4 h-14 border-b border-border flex-shrink-0">
          <BrandLogo collapsed={sidebarCollapsed} size="sm" />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 no-scrollbar">
          <div className="space-y-0.5">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <NavLink key={item.path} to={item.path} title={sidebarCollapsed ? item.label : undefined}>
                  {({ isActive }) => (
                    <div className={cn('nav-item', isActive && 'nav-item-active')}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <AnimatePresence initial={false}>
                        {!sidebarCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-sm truncate overflow-hidden whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User & collapse */}
        <div className="flex-shrink-0 border-t border-border p-2">
          {!sidebarCollapsed && (
            <div
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 px-2 py-2 mb-1 rounded-lg hover:bg-elevated cursor-pointer transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {CURRENT_USER.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary truncate">{CURRENT_USER.name}</p>
                <p className="text-2xs text-tertiary truncate">{CURRENT_USER.plan}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-tertiary hover:text-primary hover:bg-elevated transition-all"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            exit={{ x: -240 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="fixed left-0 top-0 bottom-0 w-60 bg-surface border-r border-border z-50 md:hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-border">
              <BrandLogo size="sm" />
              <button onClick={() => setMobileOpen(false)} className="text-tertiary hover:text-primary p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                    {({ isActive }) => (
                      <div className={cn('nav-item', isActive && 'nav-item-active')}>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-3 border-t border-border">
              <div
                onClick={() => { setMobileOpen(false); navigate('/settings'); }}
                className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-elevated cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {CURRENT_USER.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary truncate">{CURRENT_USER.name}</p>
                  <p className="text-2xs text-tertiary truncate">{CURRENT_USER.plan}</p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top navigation */}
        <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-border bg-surface/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-secondary hover:text-primary p-1"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-display font-semibold text-sm text-primary hidden sm:block">{currentPage}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center gap-2 bg-elevated border border-border rounded-lg px-3 py-1.5 w-52 focus-within:border-accent/50 transition-colors">
              <Search className="w-3.5 h-3.5 text-tertiary" />
              <input
                placeholder="Search media, clips…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-secondary placeholder:text-tertiary focus:outline-none w-full"
              />
            </form>

            {/* Upload CTA */}
            <button
              onClick={() => navigate('/studio')}
              className="btn-primary flex items-center gap-1.5 !py-1.5 !px-3"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload</span>
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(s => !s)}
                className="relative btn-ghost !px-2 !py-1.5"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full ring-2 ring-surface" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 sm:w-88 rounded-xl bg-elevated border border-border shadow-elevated z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface/50">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-xs text-primary">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="badge-accent text-2xs">{unreadCount} new</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-2xs text-secondary hover:text-accent p-1 transition-colors flex items-center gap-0.5"
                            title="Mark all as read"
                          >
                            <Check className="w-3 h-3" /> Mark read
                          </button>
                        )}
                        <button
                          onClick={clearNotifications}
                          className="text-2xs text-tertiary hover:text-rose p-1 transition-colors"
                          title="Clear all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-border/40">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-secondary">
                          No notifications
                        </div>
                      ) : (
                        notifications.map(item => (
                          <div
                            key={item.id}
                            className={cn(
                              'p-3 flex items-start gap-2.5 hover:bg-surface/50 transition-colors cursor-pointer',
                              !item.read && 'bg-accent/5'
                            )}
                            onClick={() => {
                              setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
                              if (item.type === 'clip') navigate('/clips');
                              else if (item.type === 'calendar') navigate('/calendar');
                              else if (item.type === 'memory') navigate('/memory');
                              else if (item.type === 'analytics') navigate('/analytics');
                              setShowNotifications(false);
                            }}
                          >
                            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-accent" style={{ opacity: item.read ? 0.2 : 1 }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-primary leading-snug">{item.title}</p>
                              <p className="text-2xs text-tertiary mt-0.5 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> {item.time}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="btn-ghost !px-2 !py-1.5"
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber" /> : <Moon className="w-4 h-4 text-violet" />}
            </button>

            {/* Avatar */}
            <button
              onClick={() => navigate('/settings')}
              className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:opacity-90 transition-opacity"
              title="Profile & Settings"
            >
              {CURRENT_USER.name.charAt(0)}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
