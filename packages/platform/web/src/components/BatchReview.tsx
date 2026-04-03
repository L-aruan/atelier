'use client';
import { useState } from 'react';
import type { BatchResult } from '@/lib/batch-engine';
import { CompareSlider } from './CompareSlider';
import { Button } from '@mediabox/ui-kit';
import { downloadAsZip, downloadSingle } from '@/lib/download-utils';

interface BatchReviewProps {
  results: BatchResult[];
  onRetryFailed: () => void;
  retrying: boolean;
}

export function BatchReview({ results, onRetryFailed, retrying }: BatchReviewProps) {
  const [showOnlyFailed, setShowOnlyFailed] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const successResults = results.filter((r) => r.status === 'success');
  const failedResults = results.filter((r) => r.status === 'failed');
  const displayed = showOnlyFailed ? failedResults : results;

  const handleDownloadAll = async () => {
    const outputs = successResults.map((r) => r.output!);
    if (outputs.length === 1) {
      downloadSingle(outputs[0]);
    } else {
      await downloadAsZip(outputs);
    }
  };

  if (selectedIndex !== null && results[selectedIndex]?.output) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setSelectedIndex(null)}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← 返回列表
        </button>
        <CompareSlider
          beforeUrl={results[selectedIndex].input.url}
          afterUrl={results[selectedIndex].output!.url}
        />
        <p className="text-xs text-gray-500 text-center">{results[selectedIndex].input.name}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
            ✓ {successResults.length}
          </span>
          <span className="mx-1">成功</span>
          {failedResults.length > 0 && (
            <>
              <span className="mx-1">·</span>
              <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
                ✗ {failedResults.length}
              </span>
              <span className="mx-1">需检查</span>
            </>
          )}
        </div>
        {failedResults.length > 0 && (
          <button
            onClick={() => setShowOnlyFailed(!showOnlyFailed)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showOnlyFailed ? '显示全部' : '仅显示问题项'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {displayed.map((r) => {
          const globalIndex = results.indexOf(r);
          return (
            <button
              key={r.input.name}
              onClick={() => r.output && setSelectedIndex(globalIndex)}
              className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                r.status === 'success'
                  ? 'border-green-300 hover:border-green-500'
                  : 'border-red-300 hover:border-red-500'
              }`}
            >
              {r.output ? (
                <img
                  src={r.output.url}
                  alt={r.input.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-400 text-lg">
                  ✗
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 justify-center pt-2">
        {failedResults.length > 0 && (
          <Button variant="secondary" onClick={onRetryFailed} disabled={retrying}>
            {retrying ? '重试中...' : `重新处理 ${failedResults.length} 张问题图`}
          </Button>
        )}
        <Button onClick={handleDownloadAll} disabled={successResults.length === 0}>
          {successResults.length <= 1 ? '下载结果' : `全部下载 (ZIP · ${successResults.length} 张)`}
        </Button>
      </div>
    </div>
  );
}
