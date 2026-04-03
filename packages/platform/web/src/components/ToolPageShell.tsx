'use client';
import { useState, useCallback } from 'react';
import { FileDropZone } from '@mediabox/ui-kit';
import { toolRegistry } from '@/lib/tool-registry';
import { filesToFileInputs, formatFileSize } from '@/lib/file-utils';
import type { FileInput, FileOutput, ToolOptions } from '@mediabox/types';

interface ToolPageShellProps {
  toolId: string;
}

export function ToolPageShell({ toolId }: ToolPageShellProps) {
  const tool = toolRegistry.get(toolId);
  const [files, setFiles] = useState<FileInput[]>([]);
  const [outputs, setOutputs] = useState<FileOutput[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleFiles = useCallback((rawFiles: File[]) => {
    const inputs = filesToFileInputs(rawFiles);
    setFiles(inputs);
    setOutputs([]);
  }, []);

  const handleProcess = useCallback(
    async (inputFiles: FileInput[], options: ToolOptions): Promise<FileOutput[]> => {
      if (!tool) return [];
      setProcessing(true);
      try {
        const results: FileOutput[] = [];
        for (const f of inputFiles) {
          const result = await tool.process(f, options);
          results.push(result);
        }
        setOutputs(results);
        return results;
      } finally {
        setProcessing(false);
      }
    },
    [tool],
  );

  const handleDownload = useCallback((results: FileOutput[]) => {
    for (const output of results) {
      const a = document.createElement('a');
      a.href = output.url;
      a.download = output.name;
      a.click();
    }
  }, []);

  if (!tool) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-lg">工具未找到</p>
      </div>
    );
  }

  const { manifest, Component } = tool;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{manifest.icon}</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{manifest.name}</h1>
            <p className="text-gray-500 text-sm">{manifest.description}</p>
          </div>
        </div>
      </div>

      {files.length === 0 ? (
        <FileDropZone
          accept={manifest.input.accept}
          multiple={manifest.input.batch}
          onFiles={handleFiles}
          className="bg-white min-h-[300px]"
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">
              {files.length} 个文件 · 共 {formatFileSize(files.reduce((s, f) => s + f.size, 0))}
            </span>
            <button
              type="button"
              onClick={() => {
                setFiles([]);
                setOutputs([]);
              }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              清除文件
            </button>
          </div>
          <Component
            files={files}
            onProcess={handleProcess}
            onDownload={handleDownload}
            processing={processing}
            outputs={outputs}
          />
        </div>
      )}
    </div>
  );
}
