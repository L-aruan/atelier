import { useCallback, useState, useRef } from 'react';
import { clsx } from 'clsx';

interface FileDropZoneProps {
  accept?: string[];
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
  children?: React.ReactNode;
}

export function FileDropZone({
  accept,
  multiple = true,
  onFiles,
  className,
  children,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (accept) {
        const filtered = files.filter((f) => accept.some((a) => f.type.startsWith(a.replace('/*', '/'))));
        onFiles(filtered);
      } else {
        onFiles(files);
      }
    },
    [accept, onFiles],
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      onFiles(files);
      e.target.value = '';
    },
    [onFiles],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={clsx(
        'border-2 border-dashed rounded-xl cursor-pointer transition-colors',
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400 bg-gray-50/50',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept?.join(',')}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      {children || (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-gray-700 font-medium">拖放文件到这里，或点击上传</p>
          <p className="text-gray-500 text-sm mt-1">支持图片、视频、音频、PDF 等</p>
        </div>
      )}
    </div>
  );
}
