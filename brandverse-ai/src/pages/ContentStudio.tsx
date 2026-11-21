import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Copy, Check, Sparkles, ChevronRight, Hash,
  Globe, Columns, Eye, Calendar, Clock, ArrowRight,
  MessageSquare, Heart, Share2, Bookmark, Send, ExternalLink, X
} from 'lucide-react';
import { AI_CLIPS, PLATFORM_CONTENT, HOOKS_LIBRARY, CURRENT_USER } from '../data/mockData';
import { useToast } from '../contexts/ToastContext';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

type Platform = 'instagram' | 'youtube' | 'linkedin' | 'x';
type LanguageMode = 'english' | 'hindi' | 'kannada';

const PLATFORM_CONFIG = {
  instagram: {
    label: 'Instagram Reels',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/30',
    activeTab: 'bg-pink-500/15 text-pink-400 border-pink-500/40',
    maxChars: 2200,
    icon: '📸',
  },
  youtube: {
    label: 'YouTube Shorts',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    activeTab: 'bg-red-500/15 text-red-400 border-red-500/40',
    maxChars: 500,
    icon: '▶',
  },
  linkedin: {
    label: 'LinkedIn Post',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    activeTab: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
    maxChars: 3000,
    icon: '💼',
  },
  x: {
    label: 'X (Twitter Thread)',
    color: 'text-zinc-300',
    bg: 'bg-zinc-500/10 border-zinc-500/30',
    activeTab: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40',
    maxChars: 280,
    icon: '✕',
  },
};

const MULTILINGUAL_CAPTIONS: Record<LanguageMode, Record<Platform, string>> = {
  english: {
    instagram: `The 5 skills AI cannot replace 🔥\n\nMost people are scared AI will take their job.\n\nAI is coming for your mediocrity, not your creativity.\n\nThe skills that remain irreplaceable:\n→ Emotional intelligence\n→ Creative intuition\n→ Cultural context\n→ Ethical judgment\n→ Authentic storytelling\n\nSave this for when you need a reminder 📌`,
    youtube: `The 5 Skills AI Will NEVER Replace (In 2026)\n\nIn this short, Aryan Sharma breaks down the human traits algorithms cannot clone: empathy, contextual taste, and contrarian vision.\n\nSubscribe for daily creator intelligence!`,
    linkedin: `Most people are asking the wrong question about AI.\n\nThey ask: "Will AI replace me?"\n\nThe real question: "Am I cultivating the human traits AI cannot duplicate?"\n\n1. Emotional intelligence — reading rooms algorithms cannot enter.\n2. Creative intuition — knowing when to break the rules.\n3. Cultural context — nuance beyond training data.\n\nWhat skills are you actively compounding?`,
    x: `AI is not replacing your creativity.\n\nIt is exposing your mediocrity.\n\n5 things machines cannot replicate:\n• Taste\n• Empathy\n• Contextual nuance\n• Moral accountability\n• Original conviction\n\nDouble down on what makes you human.`,
  },
  hindi: {
    instagram: `AI आपकी क्रिएटिविटी नहीं, आपकी साधारणता को मात देगा! 🔥\n\nअधिकतर लोग डर रहे हैं कि AI उनकी जॉब ले लेगा।\n\nलेकिन सच यह है: जो स्किल्स कभी रिप्लेस नहीं होंगी:\n→ भावनात्मक समझ (Emotional Intelligence)\n→ मौलिक सोच (Creative Intuition)\n→ सांस्कृतिक संदर्भ (Cultural Context)\n→ असली कहानी कहने का अंदाज़\n\nइसे सेव करें और अपने साथी क्रिएटर्स के साथ शेयर करें 📌`,
    youtube: `AI कभी भी इन 5 इंसानी खूबियों की जगह नहीं ले सकता!\n\nइस पॉडकास्ट क्लिप में जानिए क्यों क्रिएटर्स को AI से डरने की नहीं, बल्कि अपने यूनीक ह्यूमन टेस्ट को निखारने की ज़रूरत है। लाइक और सब्सक्राइब करें!`,
    linkedin: `AI के इस युग में सबसे बड़ा सवाल यह नहीं है कि 'क्या मशीनें हमारा काम छीन लेंगी?'\n\nसवाल यह है: क्या हम वो स्किल्स बना रहे हैं जो किसी भी एल्गोरिदम में नहीं हैं?\n\n1. मानवीय संवेदना और कनेक्शन\n2. रिस्क लेने की सहज वृत्ति\n3. प्रामाणिक आवाज़\n\nअपने विचार नीचे कमेंट में साझा करें 👇`,
    x: `AI आपकी क्रिएटिविटी नहीं छीन रहा।\n\nयह सिर्फ आलस को रिप्लेस कर रहा है।\n\nवो 5 बातें जो कोई मॉडल नहीं सीख सकता:\n• आपका सच्चा अनुभव\n• आपकी मौलिक आवाज़\n• गहरी हमदर्दी\n\nमशीनों से मत लड़िए, इंसान बनिए।`,
  },
  kannada: {
    instagram: `AI ನಿಮ್ಮ ಸೃಜನಶೀಲತೆಯನ್ನು ಕಸಿದುಕೊಳ್ಳುವುದಿಲ್ಲ, ಅದು ಸಾಧಾರಣತೆಯನ್ನು ಬದಲಾಯಿಸುತ್ತದೆ! 🔥\n\nಯಾವ ಕೌಶಲ್ಯಗಳನ್ನು AI ಬದಲಾಯಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ:\n→ ಭಾವನಾತ್ಮಕ ಬುದ್ಧಿಮತ್ತೆ (Emotional Intelligence)\n→ ನೈಜ ಸೃಜನಶೀಲ ದೃಷ್ಟಿ\n→ ಸಾಂಸ್ಕೃತಿಕ ಒಳನೋಟ\n\nಕ್ರಿಯೇಟರ್ ಸ್ನೇಹಿತರಿಗೆ ಶೇರ್ ಮಾಡಿ ಮತ್ತು ಸೇವ್ ಮಾಡಿ 📌`,
    youtube: `AI ಯುಗದಲ್ಲಿ ಕ್ರಿಯೇಟರ್‌ಗಳು ತಿಳಿಯಬೇಕಾದ ಸತ್ಯಗಳು!\n\nಆರ್ಯನ್ ಶರ್ಮಾ ಅವರ ಈ ಮಾತುಕತೆಯಲ್ಲಿ ಮನುಷ್ಯನ ಸಹಜ ಕಲೆಯ ಮಹತ್ವವನ್ನು ವಿವರಿಸಲಾಗಿದೆ. ಸಬ್‌ಸ್ಕ್ರೈಬ್ ಮಾಡಿ!`,
    linkedin: `AI ಬಗ್ಗೆ ನಾವೆಲ್ಲರೂ ಸರಿಯಾದ ಪ್ರಶ್ನೆ ಕೇಳುತ್ತಿದ್ದೇವಾ?\n\n'AI ನಮ್ಮ ಕೆಲಸ ಕಸಿದುಕೊಳ್ಳುವುದೇ?' ಎನ್ನುವುದಕ್ಕಿಂತ, 'ನಾವು ಅನಿವಾರ್ಯ ಮಾನವೀಯ ಕೌಶಲ್ಯಗಳನ್ನು ಬೆಳೆಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇವಾ?' ಎನ್ನುವುದು ಮುಖ್ಯ.\n\nನಿಮ್ಮ ಅನಿಸಿಕೆಗಳನ್ನು ಕಮೆಂಟ್ ಮಾಡಿ 👇`,
    x: `AI ತಂತ್ರಜ್ಞಾನ ನಿಮ್ಮ ಸೃಜನಶೀಲತೆಗೆ ಪರ್ಯಾಯವಲ್ಲ.\n\nಯಂತ್ರಗಳಿಗೆ ನಿಮ್ಮ ಜೀವನಾನುಭವ ಹಾಗೂ ನಿಜವಾದ ಭಾವನೆಗಳು ಇರುವುದಿಲ್ಲ.\n\nನಿಮ್ಮ ಮಾನವೀಯ ಕೌಶಲ್ಯಗಳಿಗೆ ಬಲ ನೀಡಿ.`,
  },
};

export function ContentStudio() {
  const [activePlatform, setActivePlatform] = useState<Platform>('instagram');
  const [comparisonPlatform, setComparisonPlatform] = useState<Platform>('linkedin');
  const [isSideBySide, setIsSideBySide] = useState(false);
  const [languageMode, setLanguageMode] = useState<LanguageMode>('english');
  const [activeClipId, setActiveClipId] = useState('');
  const [editedContent, setEditedContent] = useState<Record<string, Record<Platform, string>>>({});
  const [copied, setCopied] = useState(false);
  const [showHooks, setShowHooks] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Schedule modal state
  const [scheduleDate, setScheduleDate] = useState('2026-11-23');
  const [scheduleTime, setScheduleTime] = useState('09:00');

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api.listClips()
      .then((clips) => {
        if (!active) return;
        const records = clips as Array<{id: string}>;
        if (records.length > 0) setActiveClipId(records[0].id);
      })
      .catch((error) => addToast(error instanceof Error ? error.message : 'Failed to load clips.', 'error'));
    return () => { active = false; };
  }, [addToast]);

  const clip = AI_CLIPS.find(c => c.id === activeClipId);
  const platformData = (PLATFORM_CONTENT[activeClipId as keyof typeof PLATFORM_CONTENT])?.[activePlatform];

  const getContent = (plat = activePlatform) => {
    if (editedContent[activeClipId]?.[plat]) {
      return editedContent[activeClipId][plat];
    }
    return MULTILINGUAL_CAPTIONS[languageMode][plat];
  };

  const setContent = (val: string, plat = activePlatform) => {
    setEditedContent(prev => ({
      ...prev,
      [activeClipId]: { ...prev[activeClipId], [plat]: val },
    }));
  };

  const handleCopy = (plat = activePlatform) => {
    navigator.clipboard.writeText(getContent(plat)).catch(() => {});
    setCopied(true);
    addToast(`Copied ${PLATFORM_CONFIG[plat].label} caption!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDraft = () => {
    if (!activeClipId) {
      addToast('Upload media and select a clip before saving.', 'warning');
      return;
    }
    api.saveDraft({
      clip_id: activeClipId,
      platform: activePlatform,
      language: languageMode,
      title: clip?.title || 'Generated post',
      caption: getContent(activePlatform),
      hashtags: PLATFORM_CONTENT[activeClipId as keyof typeof PLATFORM_CONTENT]?.[activePlatform]?.hashtags || [],
    })
      .then(() => addToast('Edited caption saved and creator memory updated.', 'success'))
      .catch(error => addToast(error instanceof Error ? error.message : 'Draft save failed.', 'error'));
  };

  const handleRegenerate = () => {
    if (!activeClipId) {
      addToast('Upload media and select a clip before generating content.', 'warning');
      return;
    }
    setRegenerating(true);
    api.generateContent({
      clip_id: activeClipId,
      platform: activePlatform,
      language: languageMode,
    })
      .then((data) => {
        const result = data as { caption: string };
        setContent(result.caption);
        addToast('Platform content generated.', 'success');
      })
      .catch(error => addToast(error instanceof Error ? error.message : 'Content generation failed.', 'error'))
      .finally(() => setRegenerating(false));
  };

  const handleHookInsert = (hook: string) => {
    const current = getContent();
    setContent(hook + '\n\n' + current);
    setShowHooks(false);
    addToast('Hook inserted at start of caption', 'success');
  };

  const handleConfirmSchedule = () => {
    if (!activeClipId) {
      addToast('Upload media and select a clip before scheduling.', 'warning');
      return;
    }
    api.createCalendarPost({
      clip_id: activeClipId,
      title: clip?.title || 'Generated post',
      platform: activePlatform,
      scheduled_at: `${scheduleDate}T${scheduleTime}:00`,
      caption: getContent(activePlatform),
    })
      .then(() => {
        setShowScheduleModal(false);
        addToast(`Scheduled for ${PLATFORM_CONFIG[activePlatform].label}.`, 'success');
      })
      .catch(error => addToast(error instanceof Error ? error.message : 'Scheduling failed.', 'error'));
  };

  const cfg = PLATFORM_CONFIG[activePlatform];
  const currentText = getContent(activePlatform);
  const charCount = currentText.length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary">Content Studio</h1>
          <p className="text-secondary text-sm mt-1">
            Transform clips into platform-native copy calibrated for your brand voice across 4 platforms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Side-by-Side Toggle */}
          <button
            onClick={() => {
              setIsSideBySide(s => !s);
              addToast(isSideBySide ? 'Single view active' : 'Side-by-side comparison active', 'info');
            }}
            className={cn(
              'btn-secondary text-xs flex items-center gap-1.5',
              isSideBySide && 'border-accent text-accent bg-accent/10'
            )}
          >
            <Columns className="w-3.5 h-3.5" />
            {isSideBySide ? 'Single Platform' : 'Side-by-Side Comparison'}
          </button>

          <button
            onClick={() => setShowScheduleModal(true)}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" />
            Schedule This Post
          </button>
        </div>
      </div>

      {/* Multilingual Selector Strip */}
      <div className="card p-3 flex items-center justify-between flex-wrap gap-3 bg-surface/70">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold text-primary">Multilingual Generation:</span>
        </div>
        <div className="flex items-center gap-2">
          {[
            { id: 'english', label: 'English (Original)' },
            { id: 'hindi', label: 'Hindi (हिंदी)' },
            { id: 'kannada', label: 'Kannada (ಕನ್ನಡ)' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => {
                setLanguageMode(m.id as LanguageMode);
                addToast(`Language switched to ${m.label}`, 'info');
              }}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                languageMode === m.id ? 'bg-accent/20 text-accent border border-accent/40 font-semibold' : 'btn-secondary text-secondary'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Source Clips */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="label">Source Clip Candidates</p>
            <button onClick={() => navigate('/clips')} className="text-2xs text-accent hover:underline">
              View all
            </button>
          </div>

          {AI_CLIPS.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveClipId(c.id)}
              className={cn(
                'w-full text-left card p-3 transition-all cursor-pointer',
                activeClipId === c.id ? 'border-accent/60 bg-accent/10 shadow-sm' : 'hover:border-border/80 card-hover'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="badge-accent text-2xs font-mono">{c.duration}</span>
                {c.selected && <span className="text-2xs text-emerald font-semibold">✓ Selected</span>}
              </div>
              <p className="text-xs font-medium text-primary line-clamp-2">{c.title}</p>
              <p className="text-2xs text-secondary mt-1 line-clamp-1">"{c.transcript}"</p>
            </button>
          ))}
        </div>

        {/* Center/Right: Single or Side-by-Side Editor */}
        <div className={cn('space-y-4', isSideBySide ? 'lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0' : 'lg:col-span-3')}>
          {/* Main Primary Platform Column */}
          <div className="space-y-4">
            {/* Platform Selector Tabs */}
            <div className="flex gap-1 p-1 bg-elevated border border-border rounded-xl overflow-x-auto no-scrollbar">
              {(Object.keys(PLATFORM_CONFIG) as Platform[]).map(p => (
                <button
                  key={p}
                  onClick={() => setActivePlatform(p)}
                  className={cn(
                    'flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    activePlatform === p ? cfg.activeTab : 'text-secondary border-transparent hover:text-primary'
                  )}
                >
                  <span className="mr-1">{PLATFORM_CONFIG[p].icon}</span>
                  {PLATFORM_CONFIG[p].label}
                </button>
              ))}
            </div>

            {/* Hook Headline */}
            {platformData?.hook && (
              <div className={cn('rounded-xl border p-3.5', cfg.bg)}>
                <span className={cn('text-2xs font-semibold uppercase tracking-wider block mb-1', cfg.color)}>
                  Detected Hook Angle
                </span>
                <p className="text-sm text-primary font-medium">"{platformData.hook}"</p>
              </div>
            )}

            {/* Editable Caption */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="label">Platform Caption & Copy</label>
                <span className={cn('text-2xs font-mono', charCount > cfg.maxChars ? 'text-rose' : 'text-tertiary')}>
                  {charCount}/{cfg.maxChars} chars
                </span>
              </div>
              <textarea
                value={currentText}
                onChange={e => setContent(e.target.value, activePlatform)}
                rows={9}
                className="input resize-none font-mono text-xs leading-relaxed"
                placeholder="Caption copy..."
              />

              {/* Hashtags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(platformData?.hashtags ?? ['#AICreator', '#PersonalBrand', '#FutureOfWork']).map(h => (
                  <span key={h} className="badge-accent text-2xs flex items-center gap-0.5">
                    <Hash className="w-2.5 h-2.5" />{h.replace('#', '')}
                  </span>
                ))}
              </div>
            </div>

            {/* Toolbar Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', regenerating && 'animate-spin')} />
                {regenerating ? 'Regenerating…' : 'Regenerate'}
              </button>

              <button
                onClick={() => setShowHooks(s => !s)}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber" />
                Hook Ideas
              </button>

              <button
                onClick={() => handleCopy(activePlatform)}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>

              <button
                onClick={handleSaveDraft}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-emerald" />
                Save Edited Draft
              </button>

              <button
                onClick={() => setShowScheduleModal(true)}
                className="btn-primary text-xs flex items-center gap-1.5 ml-auto"
              >
                <Calendar className="w-3.5 h-3.5" />
                Schedule Post
              </button>
            </div>

            {/* Hook Suggestions Accordion */}
            <AnimatePresence>
              {showHooks && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="card p-3 space-y-1.5 border-accent/40 bg-surface">
                    <p className="label mb-1 text-accent">High-Converting AI Hooks</p>
                    {HOOKS_LIBRARY.slice(0, 5).map((hook, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleHookInsert(hook)}
                        className="w-full text-left text-xs text-secondary hover:text-primary py-1.5 px-2 rounded hover:bg-elevated transition-colors truncate"
                      >
                        → {hook}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Side-by-Side Second Platform Column (When Active) */}
          {isSideBySide && (
            <div className="space-y-4">
              <div className="flex gap-1 p-1 bg-elevated border border-border rounded-xl overflow-x-auto no-scrollbar">
                {(Object.keys(PLATFORM_CONFIG) as Platform[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setComparisonPlatform(p)}
                    className={cn(
                      'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      comparisonPlatform === p ? PLATFORM_CONFIG[p].activeTab : 'text-secondary border-transparent hover:text-primary'
                    )}
                  >
                    <span>{PLATFORM_CONFIG[p].icon}</span> {PLATFORM_CONFIG[p].label}
                  </button>
                ))}
              </div>

              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="label">Comparison: {PLATFORM_CONFIG[comparisonPlatform].label}</span>
                  <button
                    onClick={() => handleCopy(comparisonPlatform)}
                    className="text-2xs text-secondary hover:text-primary flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <textarea
                  value={getContent(comparisonPlatform)}
                  onChange={e => setContent(e.target.value, comparisonPlatform)}
                  rows={13}
                  className="input resize-none font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border text-xs text-secondary flex items-center justify-between">
                <span>Side-by-side comparison allows validating platform length and format requirements.</span>
              </div>
            </div>
          )}

          {/* Live Social Post Mockup Card (Single View Only) */}
          {!isSideBySide && (
            <div className="card p-5 space-y-3 bg-surface/50">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-semibold text-xs text-primary flex items-center gap-2">
                  <Eye className="w-4 h-4 text-accent" />
                  Live Platform Preview ({PLATFORM_CONFIG[activePlatform].label})
                </h4>
                <span className="badge-accent text-2xs">Pixel Accurate Mockup</span>
              </div>

              {/* Feed Card */}
              <div className="bg-elevated rounded-xl p-4 border border-border max-w-lg mx-auto space-y-3 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white">
                    {CURRENT_USER.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary">{CURRENT_USER.name}</p>
                    <p className="text-2xs text-secondary">{CURRENT_USER.handle} · Just now</p>
                  </div>
                </div>

                <p className="text-xs text-primary/95 whitespace-pre-line leading-relaxed font-sans">
                  {currentText.slice(0, 320)}
                  {currentText.length > 320 && '...'}
                </p>

                {/* Engagement icons */}
                <div className="flex items-center gap-5 pt-2 border-t border-border/50 text-secondary text-2xs">
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose" /> 1.2K</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> 84</span>
                  <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /> 312</span>
                  <span className="flex items-center gap-1 ml-auto"><Bookmark className="w-3.5 h-3.5" /></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Scheduling Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-elevated border border-border rounded-2xl max-w-md w-full p-6 space-y-5 shadow-elevated"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-display font-semibold text-base text-primary flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent" />
                  Schedule Post to Calendar
                </h3>
                <button onClick={() => setShowScheduleModal(false)} className="text-secondary hover:text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="label mb-1 block">Platform</label>
                  <div className="p-2.5 rounded-lg bg-surface border border-border text-xs font-semibold text-primary">
                    {PLATFORM_CONFIG[activePlatform].label}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label mb-1 block">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label mb-1 block">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="input text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="label mb-1 block">Caption Preview</label>
                  <p className="text-2xs text-secondary bg-surface p-2.5 rounded-lg border border-border line-clamp-3">
                    {currentText}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSchedule}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirm & Add to Calendar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
