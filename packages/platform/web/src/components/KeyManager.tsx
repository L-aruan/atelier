'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@mediabox/ui-kit';
import {
  getApiKeys,
  addApiKey,
  removeApiKey,
  AI_PROVIDERS,
  type ApiKeyEntry,
} from '@/lib/key-store';

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function KeyManager() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState<string>(AI_PROVIDERS[0].id);
  const [keyValue, setKeyValue] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => {
    setKeys(getApiKeys());
  }, []);

  const handleAdd = useCallback(() => {
    if (!keyValue.trim()) return;
    const providerInfo = AI_PROVIDERS.find((p) => p.id === provider);
    addApiKey({
      provider,
      key: keyValue.trim(),
      label: label.trim() || providerInfo?.name || provider,
    });
    setKeys(getApiKeys());
    setKeyValue('');
    setLabel('');
    setShowAdd(false);
  }, [provider, keyValue, label]);

  const handleRemove = useCallback((id: string) => {
    removeApiKey(id);
    setKeys(getApiKeys());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">API Key 管理</h2>
          <p className="text-sm text-gray-500 mt-1">
            管理你的 AI 服务 API Key，所有 Key 仅存储在浏览器本地
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '取消' : '+ 添加 Key'}
        </Button>
      </div>

      {showAdd && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              服务商
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="sk-..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注（可选）
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="如：个人账号"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <Button onClick={handleAdd} disabled={!keyValue.trim()}>
            保存
          </Button>
        </div>
      )}

      {keys.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🔑</div>
          <p>还没有添加任何 API Key</p>
          <p className="text-xs mt-1">添加后即可使用 AI 工具</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          {keys.map((entry) => {
            const providerInfo = AI_PROVIDERS.find((p) => p.id === entry.provider);
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">
                    {(providerInfo?.name || entry.provider).charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {entry.label}
                      <span className="ml-2 text-xs text-gray-400">
                        {providerInfo?.name || entry.provider}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {maskKey(entry.key)} · 添加于 {formatDate(entry.createdAt)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(entry.id)}
                  className="text-sm text-red-400 hover:text-red-600"
                >
                  删除
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
        <strong>安全说明：</strong>所有 API Key 仅存储在你的浏览器 localStorage
        中，不会上传到服务器。清除浏览器数据会丢失已保存的 Key。
      </div>
    </div>
  );
}
