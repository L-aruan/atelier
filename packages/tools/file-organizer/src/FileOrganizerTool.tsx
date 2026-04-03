import { useState, useCallback, useRef } from 'react';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import {
  scanFiles,
  planByName,
  planByType,
  buildZip,
  type FileScanResult,
  type FileMove,
} from './engine';

function formatBytes(n: number): string {
  if (n === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${parseFloat((n / k ** i).toFixed(i > 0 ? 1 : 0))} ${sizes[i]}`;
}

function fileKindIcon(file: File): string {
  const t = file.type;
  if (t.startsWith('image/')) return '🖼';
  if (t.startsWith('video/')) return '🎬';
  if (t.startsWith('audio/')) return '🎵';
  if (t.includes('pdf')) return '📄';
  if (t.includes('zip') || t.includes('rar') || t.includes('tar')) return '📦';
  if (t.startsWith('text/') || t.includes('json') || t.includes('xml')) return '📝';
  return '📎';
}

function topExtEntries(extGroups: Record<string, number>, limit: number): [string, number][] {
  return Object.entries(extGroups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function FileOrganizerTool({ files: _files }: ToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [scanResult, setScanResult] = useState<FileScanResult | null>(null);
  const [mode, setMode] = useState<'name' | 'type'>('name');
  const [plan, setPlan] = useState<FileMove[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const applyFileList = useCallback((arr: File[]) => {
    setFiles(arr);
    setScanResult(arr.length ? scanFiles(arr) : null);
    setPlan(null);
  }, []);

  const handleFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList) return;
      applyFileList(Array.from(fileList));
      e.target.value = '';
    },
    [applyFileList],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      applyFileList(Array.from(e.dataTransfer.files));
    },
    [applyFileList],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handlePreview = useCallback(() => {
    if (files.length === 0) return;
    const moves = mode === 'name' ? planByName(files) : planByType(files);
    setPlan(moves);
  }, [files, mode]);

  const handleExecute = useCallback(async () => {
    if (!plan || plan.length === 0) return;
    setProcessing(true);
    try {
      const blob = await buildZip(plan);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'atelier-organized.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setProcessing(false);
    }
  }, [plan]);

  const extTop = scanResult ? topExtEntries(scanResult.extGroups, 6) : [];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0 space-y-4">
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFiles}
        />

        {files.length === 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
          >
            <div className="text-4xl mb-3">📂</div>
            <p className="text-gray-700 font-medium">拖放文件到此处，或点击选择</p>
            <p className="text-sm text-gray-500 mt-2">支持多文件，整理后打包为 ZIP 下载</p>
          </button>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">已选文件 ({files.length})</span>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => inputRef.current?.click()}
              >
                重新选择
              </button>
            </div>
            <div
              className="max-h-[300px] overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-100"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {files.map((f) => (
                <div
                  key={`${f.name}-${f.size}-${f.lastModified}`}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm bg-white hover:bg-gray-50"
                >
                  <span className="text-lg flex-shrink-0" aria-hidden>
                    {fileKindIcon(f)}
                  </span>
                  <span className="truncate flex-1 text-gray-800" title={f.name}>
                    {f.name}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0">{formatBytes(f.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {scanResult && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                文件: <strong className="text-gray-700">{scanResult.fileCount}</strong>
              </span>
              <span>
                不同文件名（去扩展名）:{' '}
                <strong className="text-gray-700">{scanResult.nameGroups}</strong>
              </span>
              <span>
                同名组（≥2 个文件）:{' '}
                <strong className="text-gray-700">{scanResult.duplicatedNames}</strong>
              </span>
            </div>
            <div className="mt-2 text-gray-600">
              类型分布（前 6）:{' '}
              {extTop.length === 0 ? (
                '—'
              ) : (
                extTop.map(([ext, c], i) => (
                  <span key={ext}>
                    {i > 0 ? ' · ' : ''}
                    {ext}({c})
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {plan !== null && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">整理预览</h3>
            {plan.length === 0 ? (
              <p className="text-sm text-gray-600">文件已是整理好的状态，无需移动</p>
            ) : (
              <div className="max-h-[220px] overflow-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm text-left">
                  <tbody>
                    {plan.map((m, idx) => (
                      <tr
                        key={`${m.file.name}-${m.file.size}-${idx}`}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-3 py-2 text-gray-800 truncate max-w-[40%]" title={m.file.name}>
                          {m.file.name}
                        </td>
                        <td className="px-2 py-2 text-gray-400 w-8">→</td>
                        <td className="px-3 py-2 text-gray-600 font-mono text-xs">
                          {m.targetFolder}/{m.targetName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="w-full lg:w-72 space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">整理规则</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('name');
                  setPlan(null);
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  mode === 'name'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                按同名
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('type');
                  setPlan(null);
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  mode === 'type'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                按类型
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              {mode === 'name'
                ? '仅当同一主文件名（去扩展名）出现 2 个及以上文件时，归入同名文件夹。'
                : '所有文件按扩展名分文件夹；无扩展名归入「其他」。'}
            </p>
          </div>

          {scanResult && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <div className="font-medium text-gray-600 mb-1">统计</div>
              <div>共 {scanResult.fileCount} 个文件</div>
              <div className="mt-1">同名组 {scanResult.duplicatedNames} 个</div>
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            disabled={files.length === 0}
            onClick={handlePreview}
            className="w-full !bg-amber-500 hover:!bg-amber-600 active:!bg-amber-700 !text-white border-0"
          >
            预览方案
          </Button>

          <Button
            type="button"
            variant="primary"
            disabled={!plan || plan.length === 0 || processing}
            onClick={handleExecute}
            className="w-full !bg-green-600 hover:!bg-green-700 active:!bg-green-800 !text-white border-0"
          >
            {processing ? '打包中…' : '开始整理'}
          </Button>
        </div>
      </div>
    </div>
  );
}
