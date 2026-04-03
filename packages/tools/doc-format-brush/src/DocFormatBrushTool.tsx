import { useCallback, useState, useRef } from 'react';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import {
  KEY_STYLES,
  loadDocxInfo,
  type DocInfo,
  type FormatOptions,
  type StyleInfo,
} from './engine';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function base64ToBlob(base64: string): Blob {
  const bin = atob(base64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

function summarizePage(info: DocInfo | null): string {
  if (!info) return '—';
  const { page, defaults } = info;
  const m = page.margins;
  return `${page.paperSize} · ${page.orientation === 'landscape' ? '横向' : '纵向'} · 边距 ${m.top}/${m.bottom}/${m.left}/${m.right} cm · 默认 ${defaults.asciiFont ?? '—'} ${defaults.eaFont ? ` / ${defaults.eaFont}` : ''} ${defaults.size != null ? `${defaults.size}pt` : ''}`;
}

function styleSignature(s: StyleInfo | undefined): string {
  if (!s) return '';
  return [
    s.asciiFont,
    s.eaFont,
    s.size,
    s.bold,
    s.italic,
    s.alignment,
    s.lineSpacing,
  ].join('|');
}

function stylesDiffer(a: StyleInfo | undefined, b: StyleInfo | undefined): boolean {
  return styleSignature(a) !== styleSignature(b);
}

const defaultOptions: FormatOptions = {
  pageSetup: true,
  docDefaults: true,
  styles: true,
  headerFooter: false,
  numbering: false,
  clearParaFormat: false,
  clearCharFormat: false,
};

export interface DocFormatBrushToolExtraProps {
  callFormatBrush?: (
    templateBase64: string,
    targetBase64: string,
    options: FormatOptions,
  ) => Promise<{ resultBase64: string }>;
  addToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export type DocFormatBrushToolProps = ToolProps & DocFormatBrushToolExtraProps;

export function DocFormatBrushTool({
  callFormatBrush,
  addToast,
}: DocFormatBrushToolProps) {
  const templateInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);

  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [templateInfo, setTemplateInfo] = useState<DocInfo | null>(null);
  const [targetInfo, setTargetInfo] = useState<DocInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [options, setOptions] = useState<FormatOptions>(defaultOptions);
  const [converting, setConverting] = useState(false);

  const loadInfoForFile = useCallback(async (file: File, which: 'template' | 'target') => {
    const buf = await file.arrayBuffer();
    const info = await loadDocxInfo(buf);
    if (which === 'template') {
      setTemplateInfo(info);
    } else {
      setTargetInfo(info);
    }
  }, []);

  const onPickTemplate = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      setInfoError(null);
      if (!f) {
        setTemplateFile(null);
        setTemplateInfo(null);
        return;
      }
      setTemplateFile(f);
      try {
        await loadInfoForFile(f, 'template');
      } catch (err) {
        setTemplateInfo(null);
        setInfoError(err instanceof Error ? err.message : '无法读取模板文档');
      }
    },
    [loadInfoForFile],
  );

  const onPickTarget = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      setInfoError(null);
      if (!f) {
        setTargetFile(null);
        setTargetInfo(null);
        return;
      }
      setTargetFile(f);
      try {
        await loadInfoForFile(f, 'target');
      } catch (err) {
        setTargetInfo(null);
        setInfoError(err instanceof Error ? err.message : '无法读取目标文档');
      }
    },
    [loadInfoForFile],
  );

  const handleConvert = useCallback(async () => {
    if (!templateFile || !targetFile || !callFormatBrush) {
      addToast?.('请先选择模板与目标文档', 'error');
      return;
    }
    setConverting(true);
    try {
      const tBuf = await templateFile.arrayBuffer();
      const gBuf = await targetFile.arrayBuffer();
      const templateBase64 = arrayBufferToBase64(tBuf);
      const targetBase64 = arrayBufferToBase64(gBuf);
      const { resultBase64 } = await callFormatBrush(templateBase64, targetBase64, options);
      const blob = base64ToBlob(resultBase64);
      const name = targetFile.name.replace(/\.docx$/i, '') + '-格式刷.docx';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      addToast?.('转换完成，已开始下载', 'success');
    } catch (e) {
      addToast?.(e instanceof Error ? e.message : '转换失败', 'error');
    } finally {
      setConverting(false);
    }
  }, [templateFile, targetFile, callFormatBrush, options, addToast]);

  const styleRows = KEY_STYLES.filter(
    (name) => templateInfo?.styles[name] || targetInfo?.styles[name],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <p className="text-sm font-medium text-gray-800 mb-2">模板文档</p>
            <input
              ref={templateInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={onPickTemplate}
            />
            <Button
              type="button"
              variant="secondary"
              className="mb-2"
              onClick={() => templateInputRef.current?.click()}
            >
              选择文件
            </Button>
            {templateFile && (
              <p className="text-xs text-gray-600 truncate mb-2" title={templateFile.name}>
                {templateFile.name}
              </p>
            )}
            <p className="text-xs text-gray-500 leading-relaxed">{summarizePage(templateInfo)}</p>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <p className="text-sm font-medium text-gray-800 mb-2">目标文档</p>
            <input
              ref={targetInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={onPickTarget}
            />
            <Button
              type="button"
              variant="secondary"
              className="mb-2"
              onClick={() => targetInputRef.current?.click()}
            >
              选择文件
            </Button>
            {targetFile && (
              <p className="text-xs text-gray-600 truncate mb-2" title={targetFile.name}>
                {targetFile.name}
              </p>
            )}
            <p className="text-xs text-gray-500 leading-relaxed">{summarizePage(targetInfo)}</p>
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-gray-800">应用选项</p>
            {(
              [
                ['pageSetup', '页面设置（纸张、边距、方向）'],
                ['docDefaults', '默认字体（docDefaults）'],
                ['styles', '样式定义'],
                ['headerFooter', '页眉页脚'],
                ['numbering', '编号 / 列表'],
                ['clearParaFormat', '清除段落直接格式'],
                ['clearCharFormat', '清除字符直接格式'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(e) =>
                    setOptions((o: FormatOptions) => ({ ...o, [key]: e.target.checked }))
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <Button
            className="w-full"
            disabled={!templateFile || !targetFile || !callFormatBrush || converting}
            onClick={handleConvert}
          >
            {converting ? '正在转换...' : '开始转换'}
          </Button>
          {!callFormatBrush && (
            <p className="text-xs text-amber-600">未连接服务端接口，请从工具页打开本工具。</p>
          )}
        </div>
      </div>

      {infoError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{infoError}</div>
      )}

      {templateInfo && targetInfo && styleRows.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <p className="text-sm font-medium text-gray-800 px-4 py-3 bg-gray-50 border-b border-gray-200">
            样式对比（红色表示与模板不一致）
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="px-3 py-2 font-medium">样式</th>
                  <th className="px-3 py-2 font-medium">模板</th>
                  <th className="px-3 py-2 font-medium">目标</th>
                </tr>
              </thead>
              <tbody>
                {styleRows.map((name) => {
                  const ts = templateInfo.styles[name];
                  const us = targetInfo.styles[name];
                  const diff = stylesDiffer(ts, us);
                  const cell = (s: StyleInfo | undefined) =>
                    s
                      ? `${s.asciiFont ?? '—'} / ${s.eaFont ?? '—'} · ${s.size ?? '—'}pt${s.bold ? ' · 粗' : ''}${s.italic ? ' · 斜' : ''}${s.alignment ? ` · ${s.alignment}` : ''}`
                      : '—';
                  return (
                    <tr key={name} className={diff ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2 font-medium text-gray-800 border-t border-gray-100">{name}</td>
                      <td className="px-3 py-2 text-gray-600 border-t border-gray-100">{cell(ts)}</td>
                      <td className="px-3 py-2 text-gray-600 border-t border-gray-100">{cell(us)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
