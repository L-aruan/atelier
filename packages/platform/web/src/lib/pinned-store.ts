const PINNED_KEY = 'mediabox:pinned-tools';
const RECENT_KEY = 'mediabox:recent-tools';

export const LOCAL_STORAGE_CHANGED = 'mediabox-local-storage';

function emitLocalStorageChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_CHANGED));
  }
}

export interface RecentToolEntry {
  toolId: string;
  lastUsed: number;
  count: number;
}

export function getPinnedTools(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]');
  } catch {
    return [];
  }
}

export function togglePinTool(toolId: string): boolean {
  if (typeof window === 'undefined') return false;
  const pinned = getPinnedTools();
  const idx = pinned.indexOf(toolId);
  if (idx >= 0) {
    pinned.splice(idx, 1);
    localStorage.setItem(PINNED_KEY, JSON.stringify(pinned));
    emitLocalStorageChanged();
    return false;
  }
  pinned.push(toolId);
  localStorage.setItem(PINNED_KEY, JSON.stringify(pinned));
  emitLocalStorageChanged();
  return true;
}

export function isPinned(toolId: string): boolean {
  return getPinnedTools().includes(toolId);
}

export function getRecentTools(): RecentToolEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

export function recordToolUse(toolId: string): void {
  if (typeof window === 'undefined') return;
  const recent = getRecentTools();
  const existing = recent.find((r) => r.toolId === toolId);
  if (existing) {
    existing.lastUsed = Date.now();
    existing.count++;
  } else {
    recent.push({ toolId, lastUsed: Date.now(), count: 1 });
  }
  recent.sort((a, b) => b.lastUsed - a.lastUsed);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 20)));
  emitLocalStorageChanged();
}
