/**
 * deepiri-emotion: Emotional AI agent and profile service.
 * Manages agent profiles, emotional state, and personality-driven behavior.
 */

import { PREDEFINED_AGENTS } from './predefinedAgents.js';

const STORAGE_KEY_PROFILES = 'deepiri_emotion_profiles';
const STORAGE_KEY_ACTIVE_AGENT = 'deepiri_emotion_active_agent';
const STORAGE_KEY_EMOTIONAL_STATE = 'deepiri_emotion_state';

const DEFAULT_PROFILES = PREDEFINED_AGENTS.map((p) => ({ ...p, avatar: p.avatar ?? null }));

export function getStoredProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PROFILES;
      // Migration: if user only had the old single default profile, give them all predefined agents
      if (parsed.length === 1 && parsed[0].id === 'default' && !parsed[0].builtIn) {
        saveProfiles(DEFAULT_PROFILES);
        return DEFAULT_PROFILES;
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_PROFILES;
}

export function saveProfiles(profiles) {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (e) {
    console.warn('emotionService: failed to save profiles', e);
  }
}

export function getActiveAgentId() {
  return localStorage.getItem(STORAGE_KEY_ACTIVE_AGENT) || 'default';
}

export function setActiveAgentId(id) {
  localStorage.setItem(STORAGE_KEY_ACTIVE_AGENT, id);
}

export function getEmotionalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMOTIONAL_STATE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.valence === 'number') return parsed;
    }
  } catch { /* ignore */ }
  return {
    valence: 0,
    energy: 0.5,
    focus: 0.5,
    updatedAt: new Date().toISOString()
  };
}

export function setEmotionalStateFromChat({ sentiment = 0, messageLength = 0 }) {
  const prev = getEmotionalState();
  const valence = typeof sentiment === 'number' ? Math.max(-1, Math.min(1, sentiment)) : prev.valence;
  const energy = messageLength > 200 ? Math.min(1, prev.energy + 0.1) : prev.energy;
  const next = {
    valence,
    energy: Math.max(0.1, Math.min(1, energy)),
    focus: prev.focus,
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(STORAGE_KEY_EMOTIONAL_STATE, JSON.stringify(next));
  } catch { /* ignore */ }
  return next;
}

export function getAgentResponseHints(profile, emotionalState) {
  // Hints for the AI backend to tailor tone and proactivity.
  if (!profile) return {};
  return {
    personality: profile.personality || [],
    tone: profile.tone || 'neutral',
    emotionalContext: emotionalState
  };
}

export { PREDEFINED_AGENTS, getPredefinedAgentById } from './predefinedAgents.js';
