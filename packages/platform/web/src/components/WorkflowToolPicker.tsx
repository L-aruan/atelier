'use client';

import { Button } from '@mediabox/ui-kit';
import { toolRegistry } from '@/lib/tool-registry';

interface WorkflowToolPickerProps {
  onSelect: (toolId: string) => void;
  onClose: () => void;
}

export function WorkflowToolPicker({ onSelect, onClose }: WorkflowToolPickerProps) {
  const tools = toolRegistry.getAll().filter((t) => t.manifest.input.batch);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">选择工具</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="px-5 pt-3 text-sm text-gray-500">仅显示支持批量处理的工具，点击添加到工作流末尾。</p>
        <div className="p-5 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tools.map((t) => (
              <button
                key={t.manifest.id}
                type="button"
                onClick={() => onSelect(t.manifest.id)}
                className="flex items-start gap-3 text-left p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              >
                <span className="text-2xl flex-shrink-0" aria-hidden>
                  {t.manifest.icon}
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900">{t.manifest.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5 line-clamp-2">{t.manifest.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
        </div>
      </div>
    </div>
  );
}
