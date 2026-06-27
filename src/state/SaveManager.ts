// Serialize GameState <-> localStorage. Because all persistent state funnels
// through GameState.data, this is just JSON round-tripping with a version gate.

import { GameState, SAVE_VERSION } from './GameState';
import type { GameStateData } from './types';

const KEY = 'wwc.save.v1';

export const SaveManager = {
  hasSave(): boolean {
    try {
      return !!localStorage.getItem(KEY);
    } catch {
      return false;
    }
  },

  save(): void {
    try {
      const payload = JSON.stringify(GameState.data);
      localStorage.setItem(KEY, payload);
    } catch (e) {
      console.warn('Save failed', e);
    }
  },

  load(): boolean {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as GameStateData;
      if (!data || typeof data !== 'object') return false;
      if (data.version !== SAVE_VERSION) {
        console.warn('Save version mismatch, ignoring old save');
        return false;
      }
      GameState.loadFrom(data);
      return true;
    } catch (e) {
      console.warn('Load failed', e);
      return false;
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};
