import { useState, useCallback, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@mediabox/ui-kit';
import type { ToolProps } from '@mediabox/types';
import type { CropToolOptions } from './processor';

const ASPECT_RATIOS = [
  { label: '自由', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '3:4', value: 3 / 4 },
  { label: '9:16', value: 9 / 16 },
];

export function ImageCropTool({ files, onProcess, onDownload, processing, outputs }: ToolProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [currentIndex, setCurrentIndex] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const currentFile = files[currentIndex];
  const hasOutput = outputs.length > 0;

  const handleCrop = useCallback(async () => {
    if (!completedCrop || !imgRef.current) return;

    const img = imgRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const options: CropToolOptions = {
      region: {
        x: Math.round(completedCrop.x * scaleX),
        y: Math.round(completedCrop.y * scaleY),
        width: Math.round(completedCrop.width * scaleX),
        height: Math.round(completedCrop.height * scaleY),
      },
    };

    await onProcess(files, options);
  }, [completedCrop, files, onProcess]);

  if (!currentFile) {
    return <div className="text-center py-12 text-gray-500">请先上传图片</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
          >
            <img
              ref={imgRef}
              src={currentFile.url}
              alt={currentFile.name}
              className="max-h-[500px] object-contain"
            />
          </ReactCrop>
        </div>

        {files.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            {files.map((f, i) => (
              <button
                key={f.name}
                type="button"
                onClick={() => {
                  setCurrentIndex(i);
                  setCrop(undefined);
                }}
                className={`flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden
                  ${i === currentIndex ? 'border-blue-500' : 'border-gray-200'}`}
              >
                <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-full lg:w-72 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">比例</label>
          <div className="grid grid-cols-3 gap-2">
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => {
                  setAspect(r.value);
                  setCrop(undefined);
                }}
                className={`px-2 py-1.5 text-xs rounded-lg border transition-colors
                  ${
                    aspect === r.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {completedCrop && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            裁剪区域: {Math.round(completedCrop.width)}×{Math.round(completedCrop.height)}px
          </div>
        )}

        <Button onClick={handleCrop} disabled={!completedCrop || processing} className="w-full">
          {processing ? '处理中...' : `裁剪${files.length > 1 ? ` (${files.length} 张)` : ''}`}
        </Button>

        {hasOutput && (
          <Button variant="secondary" onClick={() => onDownload(outputs)} className="w-full">
            下载结果
          </Button>
        )}
      </div>
    </div>
  );
}
