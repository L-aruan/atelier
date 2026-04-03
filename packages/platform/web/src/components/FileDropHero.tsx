'use client';
import { useCallback, useState } from 'react';
import { FileDropZone } from '@mediabox/ui-kit';
import { toolRegistry } from '@/lib/tool-registry';
import { getFileCategory } from '@/lib/file-utils';
import type { ToolManifest } from '@mediabox/types';
import { useRouter } from 'next/navigation';

export function FileDropHero() {
  const router = useRouter();
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [suggestedTools, setSuggestedTools] = useState<ToolManifest[]>([]);

  const handleFiles = useCallback((files: File[]) => {
    setDroppedFiles(files);
    if (files.length > 0) {
      const primaryType = files[0].type;
      const tools = toolRegistry.getForFileType(primaryType);
      setSuggestedTools(tools);
    }
  }, []);

  const handleToolSelect = useCallback(
    (toolId: string) => {
      router.push(`/tool/${toolId}`);
    },
    [router],
  );

  if (suggestedTools.length > 0) {
    const category = getFileCategory(droppedFiles[0]?.type || '');
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-green-500">✓</span>
          <span className="text-gray-700 text-sm">
            已识别 <strong>{droppedFiles.length} 个{category === 'image' ? '图片' : '文件'}</strong>
            ，以下工具可处理：
          </span>
          <button
            onClick={() => { setDroppedFiles([]); setSuggestedTools([]); }}
            className="ml-auto text-gray-400 hover:text-gray-600 text-sm"
          >
            清除
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {suggestedTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center
                         hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="text-2xl">{tool.icon}</div>
              <div className="text-gray-700 text-xs font-medium mt-1">{tool.name}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <FileDropZone onFiles={handleFiles} className="bg-white" />;
}
