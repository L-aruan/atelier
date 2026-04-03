'use client';
import { useState, useCallback, useRef } from 'react';
import { FileDropZone } from '@mediabox/ui-kit';
import { toolRegistry } from '@/lib/tool-registry';
import { filesToFileInputs, formatFileSize } from '@/lib/file-utils';
import { runPreview, runBatch, retryFailed } from '@/lib/batch-engine';
import type { BatchResult, BatchPhase } from '@/lib/batch-engine';
import type { FileInput, FileOutput, ToolOptions } from '@mediabox/types';
import { BatchPreview } from './BatchPreview';
import { BatchProgress } from './BatchProgress';
import { BatchReview } from './BatchReview';

interface ToolPageShellProps {
  toolId: string;
}

export function ToolPageShell({ toolId }: ToolPageShellProps) {
  const tool = toolRegistry.get(toolId);
  const [files, setFiles] = useState<FileInput[]>([]);
  const [outputs, setOutputs] = useState<FileOutput[]>([]);
  const [processing, setProcessing] = useState(false);

  const [batchPhase, setBatchPhase] = useState<BatchPhase>('idle');
  const [previewResults, setPreviewResults] = useState<BatchResult[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0, failed: 0, currentFile: '' });
  const [retrying, setRetrying] = useState(false);

  const lastOptionsRef = useRef<ToolOptions>({});

  const isBatchMode = files.length > 1;

  const handleFiles = useCallback((rawFiles: File[]) => {
    const inputs = filesToFileInputs(rawFiles);
    setFiles(inputs);
    setOutputs([]);
    setBatchPhase('idle');
    setPreviewResults([]);
    setBatchResults([]);
  }, []);

  const handleProcess = useCallback(
    async (inputFiles: FileInput[], options: ToolOptions): Promise<FileOutput[]> => {
      if (!tool) return [];
      lastOptionsRef.current = options;

      if (isBatchMode) {
        setProcessing(true);
        setBatchPhase('preview');
        try {
          const results = await runPreview(tool, inputFiles, options, 3);
          setPreviewResults(results);
        } finally {
          setProcessing(false);
        }
        return [];
      }

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
    [tool, isBatchMode],
  );

  const handleConfirmBatch = useCallback(async () => {
    if (!tool) return;
    setBatchPhase('executing');
    setProgress({ completed: 0, total: files.length, failed: 0, currentFile: '' });

    let failCount = 0;
    const results = await runBatch(tool, files, lastOptionsRef.current, (completed, total, currentFile) => {
      setProgress((prev) => ({ ...prev, completed, total, currentFile }));
    });

    failCount = results.filter((r) => r.status === 'failed').length;
    setProgress((prev) => ({ ...prev, completed: files.length, failed: failCount, currentFile: '' }));
    setBatchResults(results);
    setBatchPhase('review');
  }, [tool, files]);

  const handleAdjust = useCallback(() => {
    setBatchPhase('idle');
    setPreviewResults([]);
  }, []);

  const handleRetryFailed = useCallback(async () => {
    if (!tool) return;
    setRetrying(true);
    const failed = batchResults.filter((r) => r.status === 'failed');
    const retried = await retryFailed(tool, failed, lastOptionsRef.current, (completed, total, currentFile) => {
      setProgress({ completed, total, failed: 0, currentFile });
    });

    setBatchResults((prev) => {
      const updated = [...prev];
      let retriedIdx = 0;
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].status === 'failed' && retriedIdx < retried.length) {
          updated[i] = retried[retriedIdx];
          retriedIdx++;
        }
      }
      return updated;
    });
    setRetrying(false);
  }, [tool, batchResults]);

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
              {isBatchMode && batchPhase === 'idle' && (
                <span className="ml-2 text-blue-500 text-xs">(批量模式)</span>
              )}
            </span>
            {batchPhase === 'idle' && (
              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setOutputs([]);
                  setBatchPhase('idle');
                  setPreviewResults([]);
                  setBatchResults([]);
                }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                清除文件
              </button>
            )}
          </div>

          {batchPhase === 'idle' && (
            <Component
              files={files}
              onProcess={handleProcess}
              onDownload={handleDownload}
              processing={processing}
              outputs={outputs}
            />
          )}

          {batchPhase === 'preview' && (
            <BatchPreview
              results={previewResults}
              totalFiles={files.length}
              onConfirm={handleConfirmBatch}
              onAdjust={handleAdjust}
            />
          )}

          {batchPhase === 'executing' && (
            <BatchProgress
              completed={progress.completed}
              total={progress.total}
              failed={progress.failed}
              currentFile={progress.currentFile}
            />
          )}

          {batchPhase === 'review' && (
            <BatchReview
              results={batchResults}
              onRetryFailed={handleRetryFailed}
              retrying={retrying}
            />
          )}
        </div>
      )}
    </div>
  );
}
