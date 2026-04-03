'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button, FileDropZone } from '@mediabox/ui-kit';
import type { Workflow, WorkflowExecution } from '@/lib/workflow-types';
import type { FileInput, FileOutput } from '@mediabox/types';
import { executeWorkflow } from '@/lib/workflow-engine';
import { filesToFileInputs } from '@/lib/file-utils';
import { downloadAsZip } from '@/lib/download-utils';
import { trpc } from '@/lib/trpc-client';
import { getKeyForProvider } from '@/lib/key-store';
import { toolRegistry } from '@/lib/tool-registry';

interface WorkflowRunnerProps {
  workflow: Workflow;
  files: FileInput[];
  onComplete: (outputs: FileOutput[]) => void;
  onBack: () => void;
}

function stepIcon(status: WorkflowExecution['stepResults'][0]['status']) {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'running':
      return '⚙️';
    case 'success':
      return '✓';
    case 'failed':
      return '✗';
    default:
      return '⏳';
  }
}

function progressPercent(execution: WorkflowExecution | null, fileCount: number, stepCount: number): number {
  if (!execution || stepCount === 0) return 0;
  const n = Math.max(1, fileCount);
  const total = stepCount * n;
  let done = 0;
  for (const r of execution.stepResults) {
    if (r.status === 'success') {
      done += n;
    } else if (r.status === 'running') {
      done += Math.min(r.outputCount, n);
      break;
    } else {
      break;
    }
  }
  return Math.min(100, Math.round((done / total) * 100));
}

export function WorkflowRunner({ workflow, files: initialFiles, onComplete, onBack }: WorkflowRunnerProps) {
  const [files, setFiles] = useState<FileInput[]>(initialFiles);
  const [running, setRunning] = useState(false);
  const [wfRunState, setWfRunState] = useState<WorkflowExecution | null>(null);
  const [outputs, setOutputs] = useState<FileOutput[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const removeBgMutation = trpc.ai.removeBg.useMutation();

  const extraOptions = useMemo(
    () => ({
      callApi: async (imageBase64: string, apiKey?: string) =>
        removeBgMutation.mutateAsync({ imageBase64, apiKey }),
      apiKey: getKeyForProvider('remove-bg') ?? undefined,
    }),
    [removeBgMutation],
  );

  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  const accept = useMemo(() => {
    const first = workflow.steps[0] ? toolRegistry.get(workflow.steps[0].toolId) : undefined;
    return first?.manifest.input.accept ?? ['image/jpeg', 'image/png', 'image/webp'];
  }, [workflow.steps]);

  const batch = useMemo(() => {
    const first = workflow.steps[0] ? toolRegistry.get(workflow.steps[0].toolId) : undefined;
    return first?.manifest.input.batch ?? true;
  }, [workflow.steps]);

  const handleDrop = useCallback((raw: File[]) => {
    setFiles(filesToFileInputs(raw));
    setOutputs(null);
    setError(null);
    setWfRunState(null);
  }, []);

  const start = useCallback(async () => {
    if (files.length === 0 || workflow.steps.length === 0) return;
    setRunning(true);
    setError(null);
    setOutputs(null);
    try {
      const result = await executeWorkflow(
        workflow,
        files,
        (ex) => {
          setWfRunState(ex);
        },
        extraOptions,
      );
      if (result.status === 'failed') {
        setError(result.errorMessage ?? '执行失败');
        setOutputs(null);
        return;
      }
      setOutputs(result.outputs);
      onComplete(result.outputs);
    } catch (e) {
      setError(String(e));
      setOutputs(null);
    } finally {
      setRunning(false);
    }
  }, [files, workflow, extraOptions, onComplete]);

  const progressPct = progressPercent(wfRunState, files.length, workflow.steps.length);

  const showDropZone = outputs === null && !running && !error;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">执行：{workflow.name}</h2>
        <Button type="button" variant="secondary" onClick={onBack}>
          返回编辑
        </Button>
      </div>

      {showDropZone && (
        <div className="space-y-4">
          <FileDropZone
            accept={accept}
            multiple={batch}
            onFiles={handleDrop}
            className="min-h-[220px] bg-gray-50 border-dashed"
          />
          {files.length > 0 && (
            <p className="text-sm text-gray-600">
              已选择 {files.length} 个文件，点击下方按钮按步骤处理。
            </p>
          )}
          <div className="flex gap-3">
            <Button type="button" onClick={start} disabled={files.length === 0}>
              开始执行
            </Button>
            {files.length > 0 && (
              <Button type="button" variant="secondary" onClick={() => setFiles([])}>
                清除文件
              </Button>
            )}
          </div>
        </div>
      )}

      {(running || wfRunState?.status === 'running') && outputs === null && !error && (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>整体进度</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {wfRunState?.currentFileName && (
            <p className="text-sm text-gray-700">
              正在处理：<span className="font-medium">{wfRunState.currentFileName}</span>
            </p>
          )}

          <ul className="space-y-2">
            {wfRunState?.stepResults.map((r, i) => (
              <li
                key={r.stepId}
                className="flex items-center gap-3 text-sm border border-gray-100 rounded-lg px-3 py-2 bg-gray-50"
              >
                <span className="text-lg" aria-hidden>
                  {stepIcon(r.status)}
                </span>
                <span className="flex-1">
                  步骤 {i + 1} · {toolRegistry.get(r.toolId)?.manifest.name ?? r.toolId}
                  {r.error && <span className="text-red-600 ml-2 text-xs">({r.error})</span>}
                </span>
                <span className="text-xs text-gray-500">
                  {r.inputCount ? `${r.outputCount}/${r.inputCount} 文件` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 text-red-800 text-sm px-4 py-3 space-y-3">
          <p>{error}</p>
          {wfRunState && wfRunState.stepResults.length > 0 && (
            <ul className="space-y-1 text-xs">
              {wfRunState.stepResults.map((r, i) => (
                <li key={r.stepId}>
                  步骤 {i + 1}: {stepIcon(r.status)} {r.error ?? r.status}
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setError(null);
                setWfRunState(null);
              }}
            >
              返回并重试
            </Button>
          </div>
        </div>
      )}

      {outputs !== null && !error && (
        <div className="space-y-4">
          <p className="text-green-700 font-medium">✓ 处理完成，共 {outputs.length} 个输出文件</p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => downloadAsZip(outputs, `${workflow.name || 'workflow'}-output.zip`)}
            >
              下载 ZIP
            </Button>
            <Button type="button" variant="secondary" onClick={onBack}>
              返回编辑
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
