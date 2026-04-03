'use client';

import { useToastStore } from '@/lib/toast-store';

const styles: Record<'success' | 'error' | 'info', string> = {
  success: 'border-green-200 bg-green-50 text-green-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-gray-200 bg-white text-gray-900',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6"
      role="region"
      aria-label="通知"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-animate pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg ${styles[t.type]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="flex-1 leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-gray-400 hover:text-gray-600"
              aria-label="关闭"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
