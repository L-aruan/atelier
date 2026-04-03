import { clsx } from 'clsx';
import type { ToolManifest } from '@mediabox/types';

interface ToolCardProps {
  manifest: ToolManifest;
  onClick?: () => void;
  className?: string;
}

export function ToolCard({ manifest, onClick, className }: ToolCardProps) {
  const isOffline = manifest.runtime.offline;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white border border-gray-200 rounded-xl p-5 text-center cursor-pointer',
        'hover:border-blue-300 hover:shadow-md transition-all',
        className,
      )}
    >
      <div className="text-3xl mb-3">{manifest.icon}</div>
      <h3 className="text-gray-900 font-semibold text-sm">{manifest.name}</h3>
      <p className="text-gray-500 text-xs mt-1 line-clamp-2">{manifest.description}</p>
      <div className="mt-3">
        {isOffline ? (
          <span className="inline-block bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-full">
            离线可用
          </span>
        ) : (
          <span className="inline-block bg-amber-50 text-amber-600 text-[10px] px-2 py-0.5 rounded-full">
            需联网
          </span>
        )}
      </div>
    </div>
  );
}
