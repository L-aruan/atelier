import { useState, useCallback, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@atelier/ui-kit';
import { PLATFORM_PRESETS, PRESET_CATEGORIES } from '@atelier/types';
import type { ToolProps } from '@atelier/types';
import type { CropToolOptions } from './processor';

const ASPECT_RATIOS = [
  { label: '自由', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '3:4', value: 3 / 4 },
  { label: '9:16', value: 9 / 16 },
];

function createDefaultCrop(
  aspect: number | undefined,
  imgWidth: number,
  imgHeight: number,
): Crop {
  const a = aspect ?? imgWidth / imgHeight;
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, a, imgWidth, imgHeight),
    imgWidth,
    imgHeight,
  );
}

export function ImageCropTool({ files, onProcess, onDownload, processing, outputs }: ToolProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number } | null>(null);

  const currentFile = files[currentIndex];
  const hasOutput = outputs.length > 0;

  const applyPreset = useCallback(
    (preset: (typeof PLATFORM_PRESETS)[number]) => {
      const ratio = preset.width / preset.height;
      setAspect(ratio);
      setSelectedPreset(preset.id);
      if (imgDimensions) {
        const newCrop = createDefaultCrop(ratio, imgDimensions.w, imgDimensions.h);
        setCrop(newCrop);
        setCompletedCrop({
          unit: 'px',
          x: (newCrop.x / 100) * imgDimensions.w,
          y: (newCrop.y / 100) * imgDimensions.h,
          width: (newCrop.width / 100) * imgDimensions.w,
          height: (newCrop.height / 100) * imgDimensions.h,
        });
      }
    },
    [imgDimensions],
  );

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
              onLoad={(e) => {
                const img = e.currentTarget;
                setImgDimensions({ w: img.width, h: img.height });
                const defaultCrop = createDefaultCrop(aspect, img.width, img.height);
                setCrop(defaultCrop);
                setCompletedCrop({
                  unit: 'px',
                  x: (defaultCrop.x / 100) * img.width,
                  y: (defaultCrop.y / 100) * img.height,
                  width: (defaultCrop.width / 100) * img.width,
                  height: (defaultCrop.height / 100) * img.height,
                });
              }}
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
                  if (imgDimensions) {
                    const newCrop = createDefaultCrop(r.value, imgDimensions.w, imgDimensions.h);
                    setCrop(newCrop);
                    setCompletedCrop({
                      unit: 'px',
                      x: (newCrop.x / 100) * imgDimensions.w,
                      y: (newCrop.y / 100) * imgDimensions.h,
                      width: (newCrop.width / 100) * imgDimensions.w,
                      height: (newCrop.height / 100) * imgDimensions.h,
                    });
                  }
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

        <div>
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
          >
            <span>平台预设</span>
            <span className="text-xs text-gray-400">{showPresets ? '收起' : '展开'}</span>
          </button>
          {showPresets && (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {PRESET_CATEGORIES.map((cat) => {
                const presets = PLATFORM_PRESETS.filter((p) => p.category === cat.id);
                return (
                  <div key={cat.id}>
                    <div className="text-xs text-gray-400 mb-1">{cat.label}</div>
                    <div className="grid grid-cols-2 gap-1">
                      {presets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className={`px-2 py-1 text-xs rounded border transition-colors text-left ${
                            selectedPreset === preset.id
                              ? 'bg-blue-50 border-blue-400 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:border-blue-300'
                          }`}
                        >
                          <div className="font-medium truncate">{preset.label}</div>
                          <div className="text-[10px] opacity-60">
                            {preset.width}×{preset.height}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
