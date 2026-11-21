import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Edit3, Check, X, Plus, ChevronRight, Lightbulb,
  History, Star, AlertCircle, Sparkles, TrendingUp, MessageSquare,
  Bot, RefreshCw, Send, Sliders, ShieldCheck, Zap
} from 'lucide-react';
import { BRAND_VOICE, CURRENT_USER } from '../data/mockData';
import { useToast } from '../contexts/ToastContext';
import { cn } from '../lib/utils';
import { PlatformBadge } from '../components/ui/UIKit';
import { api } from '../lib/api';

export function CreatorMemory() {
  const [activeTab, setActiveTab] = useState<'profile' | 'twin' | 'learning'>('twin');
  const [editing, setEditing] = useState<string | null>(null);
  const [tone, setTone] = useState(BRAND_VOICE.tone);
  const [vocab, setVocab] = useState(BRAND_VOICE.vocabulary);
  const [newWord, setNewWord] = useState('');
  const [captionLen, setCaptionLen] = useState(BRAND_VOICE.captionLength);
  const [emojiPref, setEmojiPref] = useState(BRAND_VOICE.emojiPreference);

  // Digital Twin Simulator state
  const [twinInput, setTwinInput] = useState('We need to talk about why burnout happens to high performers');
  const [twinOutput, setTwinOutput] = useState('');
  const [isGeneratingTwin, setIsGeneratingTwin] = useState(false);

  // Teach by Editing state
  const [teachOriginal, setTeachOriginal] = useState('Hey guys! Here is a great tip you MUST check out right now!');
  const [teachEdited, setTeachEdited] = useState('Here is the pattern nobody talks about in creator growth:');
  const [learnedList, setLearnedList] = useState(BRAND_VOICE.learnedPreferences);

  const { addToast } = useToast();

  useEffect(() => {
    let active = true;
    api.getMemoryProfile()
      .then((profile) => {
        if (!active) return;
        const record = profile as Record<string, unknown>;
        if (typeof record.brand_tone === 'string') setTone(record.brand_tone);
        if (Array.isArray(record.priority_vocabulary)) setVocab(record.priority_vocabulary as string[]);
      })
      .catch((error) => addToast(error instanceof Error ? error.message : 'Failed to load creator memory.', 'error'));
    return () => { active = false; };
  }, [addToast]);

  const addVocabWord = () => {
    if (newWord.trim()) {
      const next = [...vocab, newWord.trim()];
      api.updateMemoryProfile({ priority_vocabulary: next })
        .then(() => {
          setVocab(next);
          setNewWord('');
          addToast(`Added "${newWord.trim()}" to prioritized vocabulary`, 'success');
        })
        .catch(error => addToast(error instanceof Error ? error.message : 'Memory update failed.', 'error'));
    }
  };

  const removeVocabWord = (w: string) => {
    setVocab(v => v.filter(x => x !== w));
    addToast(`Removed "${w}" from vocabulary`, 'info');
  };

  const saveEdit = (field: string) => {
    const body = field === 'brand_tone' ? { brand_tone: tone } : { priority_vocabulary: vocab };
    api.updateMemoryProfile(body)
      .then(() => {
        setEditing(null);
        addToast(`Brand voice profile updated: ${field}`, 'success');
      })
      .catch(error => addToast(error instanceof Error ? error.message : 'Memory update failed.', 'error'));
  };

  const runDigitalTwinSimulation = () => {
    if (!twinInput.trim()) return;
    setIsGeneratingTwin(true);
    api.simulateTwin({ raw_thought: twinInput, target_platform: 'instagram', language: 'english' })
      .then((data) => {
        const result = data as { synthesized_voice: string };
        setTwinOutput(result.synthesized_voice);
        addToast('Digital Twin synthesis completed.', 'success');
      })
      .catch(error => addToast(error instanceof Error ? error.message : 'Digital Twin failed.', 'error'))
      .finally(() => setIsGeneratingTwin(false));
  };

  const handleSimulateLearning = () => {
    api.teachMemory({ original_text: teachOriginal, edited_text: teachEdited, platform: 'instagram' })
      .then((data) => {
        const result = data as { learned_rule: string };
        setLearnedList(prev => [result.learned_rule, ...prev]);
        addToast('Creator Memory updated from your edit.', 'success');
      })
      .catch(error => addToast(error instanceof Error ? error.message : 'Learning update failed.', 'error'));
  };

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center text-white shadow-card">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-primary">Creator Memory & Digital Twin</h1>
            <p className="text-secondary text-sm">
              Your voice, preferences, and rhetorical instincts continuously calibrated through every edit.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex gap-1 p-1 bg-elevated border border-border rounded-xl">
          <button
            onClick={() => setActiveTab('twin')}
            className={cn('px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5', activeTab === 'twin' ? 'bg-accent/20 text-accent font-semibold' : 'text-secondary hover:text-primary')}
          >
            <Bot className="w-3.5 h-3.5" /> Creator Digital Twin
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={cn('px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5', activeTab === 'profile' ? 'bg-accent/20 text-accent font-semibold' : 'text-secondary hover:text-primary')}
          >
            <Sliders className="w-3.5 h-3.5" /> Brand Voice Rules
          </button>
          <button
            onClick={() => setActiveTab('learning')}
            className={cn('px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5', activeTab === 'learning' ? 'bg-accent/20 text-accent font-semibold' : 'text-secondary hover:text-primary')}
          >
            <History className="w-3.5 h-3.5" /> Edit History & Feedback
          </button>
        </div>
      </div>

      {/* Digital Twin View */}
      {activeTab === 'twin' && (
        <div className="space-y-6">
          {/* Twin Status Banner */}
          <div className="card p-6 bg-gradient-to-r from-elevated via-elevated to-violet/10 border-violet/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet/20 border border-violet/40 flex items-center justify-center text-violet font-bold text-base">
                  {CURRENT_USER.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-base text-primary">
                      {CURRENT_USER.name}'s Digital Twin
                    </h3>
                    <span className="badge-violet text-2xs flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Voice Model v3.4 Active
                    </span>
                  </div>
                  <p className="text-2xs text-secondary mt-0.5">
                    Calibrated on 47 uploaded episodes, 312 approved posts, and 86 creator corrections.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-center bg-surface/70 px-3 py-1.5 rounded-lg border border-border">
                  <p className="text-2xs text-secondary">Persona Match</p>
                  <p className="font-display font-bold text-sm text-emerald">96.8%</p>
                </div>
                <div className="text-center bg-surface/70 px-3 py-1.5 rounded-lg border border-border">
                  <p className="text-2xs text-secondary">Vocabulary Adherence</p>
                  <p className="font-display font-bold text-sm text-accent">94.2%</p>
                </div>
                <div className="text-center bg-surface/70 px-3 py-1.5 rounded-lg border border-border">
                  <p className="text-2xs text-secondary">Tone Alignment</p>
                  <p className="font-display font-bold text-sm text-violet">Direct / Contrarian</p>
                </div>
              </div>
            </div>

            {/* Twin Characteristic Tags */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50 text-2xs">
              <span className="text-secondary font-medium">Twin Signature Instincts:</span>
              <span className="badge bg-surface border border-border text-primary">Leads with contrarian hook</span>
              <span className="badge bg-surface border border-border text-primary">Prefers em-dash (—) over colon</span>
              <span className="badge bg-surface border border-border text-primary">Forbids hype jargon ('viral', 'hack')</span>
              <span className="badge bg-surface border border-border text-primary">Line breaks every 2-3 sentences</span>
            </div>
          </div>

          {/* Interactive Voice Simulator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm text-primary flex items-center gap-2">
                  <Bot className="w-4 h-4 text-accent" />
                  Test Digital Twin Voice Simulator
                </h3>
                <span className="text-2xs text-secondary">Interactive Sandbox</span>
              </div>
              <p className="text-2xs text-secondary">
                Type an unpolished note, bullet point, or thought. The Digital Twin will articulate it in your brand voice.
              </p>

              <textarea
                value={twinInput}
                onChange={e => setTwinInput(e.target.value)}
                rows={5}
                className="input resize-none text-xs leading-relaxed"
                placeholder="Enter a talking point..."
              />

              <div className="flex items-center justify-between">
                <span className="text-2xs text-tertiary">Using learned rhythm & vocabulary</span>
                <button
                  onClick={runDigitalTwinSimulation}
                  disabled={isGeneratingTwin}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Sparkles className={cn('w-3.5 h-3.5', isGeneratingTwin && 'animate-spin')} />
                  {isGeneratingTwin ? 'Synthesizing…' : 'Synthesize in My Voice'}
                </button>
              </div>
            </div>

            {/* Synthesized Output */}
            <div className="card p-5 space-y-3 bg-surface/50 border-accent/30">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm text-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet" />
                  Twin Synthesized Output
                </h3>
                {twinOutput && <span className="badge-success text-2xs">Voice Match 97%</span>}
              </div>

              {twinOutput ? (
                <div className="p-4 rounded-xl bg-elevated border border-border space-y-3">
                  <p className="text-xs text-primary/90 whitespace-pre-line leading-relaxed font-sans">
                    {twinOutput}
                  </p>
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-2xs text-secondary">
                    <span className="text-accent font-medium">Applied: Contrarian opening + Short sentences</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(twinOutput);
                        addToast('Copied synthesized voice copy', 'success');
                      }}
                      className="text-2xs text-secondary hover:text-primary"
                    >
                      Copy Output
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-44 rounded-xl border border-dashed border-border/80 flex flex-col items-center justify-center text-center p-4">
                  <p className="text-xs text-secondary">Click "Synthesize in My Voice" on the left to see your Digital Twin in action.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Brand Voice Rules View */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voice & Tone */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-primary">Core Tone Profile</h2>
              <button onClick={() => setEditing(editing === 'tone' ? null : 'tone')} className="btn-ghost text-xs flex items-center gap-1">
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </div>
            {editing === 'tone' ? (
              <div className="space-y-2">
                <textarea
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  rows={3}
                  className="input text-sm resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit('Tone')} className="btn-primary text-xs flex items-center gap-1">
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button onClick={() => setEditing(null)} className="btn-secondary text-xs">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-secondary leading-relaxed">{tone}</p>
            )}

            <div className="pt-3 border-t border-border space-y-1">
              <p className="label">Sentence Architecture</p>
              <p className="text-xs text-secondary leading-relaxed">{BRAND_VOICE.sentenceStyle}</p>
            </div>

            <div className="pt-3 border-t border-border space-y-1">
              <p className="label">Opening Hook Philosophy</p>
              <p className="text-xs text-secondary leading-relaxed">{BRAND_VOICE.hookStyle}</p>
            </div>
          </div>

          {/* Vocabulary */}
          <div className="card p-5 space-y-4">
            <h2 className="font-display font-semibold text-primary">Vocabulary Control</h2>
            <div>
              <p className="label mb-2">Priority Words (Compounded in Twin)</p>
              <div className="flex flex-wrap gap-2">
                {vocab.map(w => (
                  <div key={w} className="badge-accent badge flex items-center gap-1">
                    {w}
                    <button onClick={() => removeVocabWord(w)} className="hover:text-rose transition-colors ml-0.5">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  className="input text-xs flex-1"
                  placeholder="Add creator vocabulary keyword…"
                  value={newWord}
                  onChange={e => setNewWord(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addVocabWord()}
                />
                <button onClick={addVocabWord} className="btn-secondary text-xs">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="label mb-2">Banned Words & Filler</p>
              <div className="flex flex-wrap gap-2">
                {BRAND_VOICE.avoidWords.map(w => (
                  <span key={w} className="badge-error badge text-2xs">{w}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Learning & Edit History View */}
      {activeTab === 'learning' && (
        <div className="space-y-6">
          {/* Teach by Editing Interactive Sandbox */}
          <div className="card p-6 space-y-4 bg-gradient-to-r from-elevated via-elevated to-accent/5 border-accent/30">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              <h3 className="font-display font-bold text-base text-primary">
                Interactive Learning Simulator: Teach by Editing
              </h3>
            </div>
            <p className="text-xs text-secondary">
              See how BRANDVERSE AI extracts implicit rules whenever you correct an AI-suggested draft:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-2xs text-rose font-semibold uppercase flex items-center gap-1">
                  <X className="w-3 h-3 text-rose" /> Unedited AI Proposal
                </label>
                <textarea
                  value={teachOriginal}
                  onChange={e => setTeachOriginal(e.target.value)}
                  rows={3}
                  className="input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-2xs text-emerald font-semibold uppercase flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald" /> Your Human Correction
                </label>
                <textarea
                  value={teachEdited}
                  onChange={e => setTeachEdited(e.target.value)}
                  rows={3}
                  className="input text-xs"
                />
              </div>
            </div>

            <button
              onClick={handleSimulateLearning}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Simulate Learning Update
            </button>
          </div>

          {/* Learned Preferences Feed */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <h3 className="font-display font-semibold text-sm text-primary">Active Learned Preference Rules</h3>
              </div>
              <span className="text-2xs text-secondary">{learnedList.length} learned heuristics</span>
            </div>

            <div className="space-y-2">
              {learnedList.map((pref, i) => (
                <div key={i} className="p-3 rounded-lg bg-surface border border-border/50 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-secondary leading-relaxed">{pref}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
