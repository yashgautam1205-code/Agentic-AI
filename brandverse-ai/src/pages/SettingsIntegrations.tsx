import React, { useEffect, useState } from 'react';
import {
  User, Briefcase, Link2, Bell, Palette,
  Check, Shield
} from 'lucide-react';
import { CURRENT_USER } from '../data/mockData';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

type SettingsTab = 'profile' | 'workspace' | 'integrations' | 'notifications' | 'appearance';

interface Integration {
  id: string;
  name: string;
  connected: boolean;
  handle: string | null;
  followers: string | null;
}

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: 'workspace', label: 'Workspace', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'integrations', label: 'Integrations', icon: <Link2 className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn('w-10 h-5 rounded-full transition-all relative', checked ? 'bg-accent' : 'bg-muted')}
    >
      <div className={cn('w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all', checked ? 'left-5' : 'left-0.5')} />
    </button>
  );
}

export function SettingsIntegrations() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [name, setName] = useState(CURRENT_USER.name);
  const [handle, setHandle] = useState(CURRENT_USER.handle);
  const [language, setLanguage] = useState('English');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [notifications, setNotifications] = useState({
    clipReady: true, scheduledPost: true, performanceAlert: false, weeklyReport: true,
  });
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();

  useEffect(() => {
    let active = true;
    api.getIntegrations()
      .then((data) => active && setIntegrations(data as Integration[]))
      .catch((error) => addToast(error instanceof Error ? error.message : 'Failed to load integrations.', 'error'));
    return () => { active = false; };
  }, [addToast]);

  const handleSave = () => addToast('Settings saved', 'success');
  const connectIntegration = (id: string) => {
    addToast(`${id} OAuth requires platform credentials and an authorized callback.`, 'warning');
  };
  const disconnectIntegration = (id: string) => {
    addToast(`${id} disconnection requires the platform OAuth implementation.`, 'warning');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="font-display font-bold text-2xl text-primary mb-6">Settings</h1>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar tabs */}
        <div className="sm:w-48 flex-shrink-0">
          <div className="space-y-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn('w-full text-left', activeTab === tab.id ? 'nav-item-active' : 'nav-item')}
              >
                {tab.icon}
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {/* Profile */}
          {activeTab === 'profile' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-display font-semibold text-primary">Profile Settings</h2>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-brand flex items-center justify-center text-xl font-bold text-white">
                  {name.charAt(0)}
                </div>
                <button
                  onClick={() => addToast('Avatar upload dialog opened', 'info')}
                  className="btn-secondary text-sm"
                >
                  Change Photo
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label mb-1 block">Full Name</label>
                  <input className="input" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="label mb-1 block">Handle</label>
                  <input className="input" value={handle} onChange={e => setHandle(e.target.value)} />
                </div>
                <div>
                  <label className="label mb-1 block">Plan</label>
                  <div className="flex items-center gap-2">
                    <span className="input !bg-elevated text-secondary cursor-not-allowed select-none">{CURRENT_USER.plan}</span>
                    <button
                      onClick={() => addToast('Pro Creator plan active ($49/mo) — unlimited clips & 4K transcoding', 'info')}
                      className="btn-primary text-xs flex-shrink-0"
                    >
                      Manage Plan
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label mb-1 block">Member Since</label>
                  <input className="input !bg-elevated text-secondary cursor-not-allowed" value={CURRENT_USER.joined} readOnly />
                </div>
              </div>
              <button onClick={handleSave} className="btn-primary">Save Profile</button>
            </div>
          )}

          {/* Workspace */}
          {activeTab === 'workspace' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-display font-semibold text-primary">Workspace</h2>
              <div>
                <label className="label mb-1 block">Default Content Language</label>
                <div className="flex gap-2">
                  {['English', 'Hindi', 'Kannada'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); addToast(`Default language set to ${lang}`, 'success'); }}
                      className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', language === lang ? 'bg-accent/15 text-accent border border-accent/30' : 'btn-secondary')}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                <p className="font-medium text-sm text-primary">Multilingual Generation</p>
                <p className="text-xs text-secondary">Generate captions in multiple languages simultaneously. Each language uses your brand voice profile calibrated for that language.</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">Generate in all languages</span>
                  <Toggle checked={true} onChange={() => addToast('Multilingual generation toggled', 'info')} />
                </div>
              </div>
            </div>
          )}

          {/* Integrations */}
          {activeTab === 'integrations' && (
            <div className="card p-6 space-y-4">
              <h2 className="font-display font-semibold text-primary">Connected Accounts</h2>
              <p className="text-xs text-secondary">Connect your social accounts to enable scheduling and import real performance data.</p>
              <div className="space-y-3">
                {integrations.map(integration => (
                  <div key={integration.id} className={cn('flex items-center justify-between p-4 rounded-xl border transition-all', integration.connected ? 'border-emerald/20 bg-emerald/5' : 'border-border bg-elevated')}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-elevated flex items-center justify-center">
                        <span className="text-sm">{integration.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">{integration.name}</p>
                        {integration.connected ? (
                          <p className="text-xs text-secondary">{integration.handle} · {integration.followers} followers</p>
                        ) : (
                          <p className="text-xs text-tertiary">Not connected</p>
                        )}
                      </div>
                    </div>
                    {integration.connected ? (
                      <div className="flex items-center gap-2">
                        <span className="badge-success badge text-xs flex items-center gap-1"><Check className="w-3 h-3" />Connected</span>
                        <button onClick={() => disconnectIntegration(integration.id)} className="btn-ghost text-xs text-rose hover:text-rose">Disconnect</button>
                      </div>
                    ) : (
                      <button onClick={() => connectIntegration(integration.id)} className="btn-primary text-xs">
                        Connect
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="card p-6 space-y-4">
              <h2 className="font-display font-semibold text-primary">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: 'clipReady', label: 'Clip Processing Complete', desc: 'When AI finishes analyzing your media' },
                  { key: 'scheduledPost', label: 'Post Scheduled', desc: 'Confirmation when a post is added to calendar' },
                  { key: 'performanceAlert', label: 'Performance Alerts', desc: 'When a post significantly over or underperforms' },
                  { key: 'weeklyReport', label: 'Weekly Report', desc: 'Summary of content performance every Monday' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-primary">{item.label}</p>
                      <p className="text-xs text-secondary">{item.desc}</p>
                    </div>
                    <Toggle
                      checked={notifications[item.key as keyof typeof notifications]}
                      onChange={() => {
                        setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof notifications] }));
                        addToast(`Notification preference updated`, 'info');
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeTab === 'appearance' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-display font-semibold text-primary">Appearance</h2>
              <div>
                <label className="label mb-3 block">Theme</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'dark', label: 'Dark', desc: 'Midnight Studio', preview: 'bg-gradient-to-br from-[#090B10] to-[#121722]' },
                    { id: 'light', label: 'Light', desc: 'Bright Workspace', preview: 'bg-gradient-to-br from-zinc-100 to-white' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => { if (theme !== t.id) toggleTheme(); }}
                      className={cn('rounded-xl border p-4 text-left transition-all', theme === t.id ? 'border-accent/40' : 'border-border hover:border-border/80')}
                    >
                      <div className={cn('h-16 rounded-lg mb-3 border border-border/30', t.preview)} />
                      <p className="text-sm font-medium text-primary">{t.label}</p>
                      <p className="text-xs text-secondary">{t.desc}</p>
                      {theme === t.id && <span className="badge-accent badge mt-1 text-2xs">Active</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
