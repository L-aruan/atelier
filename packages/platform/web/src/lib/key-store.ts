const STORAGE_KEY = 'mediabox:api-keys';

export interface ApiKeyEntry {
  id: string;
  provider: string;
  key: string;
  label: string;
  createdAt: number;
}

export const AI_PROVIDERS = [
  { id: 'remove-bg', name: 'remove.bg', description: 'AI 抠图' },
  { id: 'openai', name: 'OpenAI', description: 'GPT / DALL-E' },
  { id: 'stability-ai', name: 'Stability AI', description: 'Stable Diffusion' },
] as const;

function readKeys(): ApiKeyEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeKeys(keys: ApiKeyEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function getApiKeys(): ApiKeyEntry[] {
  return readKeys();
}

export function addApiKey(entry: Omit<ApiKeyEntry, 'id' | 'createdAt'>): ApiKeyEntry {
  const keys = readKeys();
  const newEntry: ApiKeyEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  keys.push(newEntry);
  writeKeys(keys);
  return newEntry;
}

export function removeApiKey(id: string): void {
  const keys = readKeys().filter((k) => k.id !== id);
  writeKeys(keys);
}

export function getKeyForProvider(provider: string): string | null {
  const keys = readKeys();
  const entry = keys.find((k) => k.provider === provider);
  return entry?.key || null;
}
