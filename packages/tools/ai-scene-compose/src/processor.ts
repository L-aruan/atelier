import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

export interface SceneComposeOptions extends ToolOptions {
  scenePrompt: string;
  apiKey?: string;
  customBackgroundBase64?: string;
  callRemoveBg: (imageBase64: string, apiKey?: string) => Promise<{ resultBase64: string; type: string }>;
  callGenerateImage: (params: {
    prompt: string;
    size?: string;
    quality?: string;
    n?: number;
    apiKey?: string;
  }) => Promise<{ images: string[] }>;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function base64ToImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/png;base64,${base64}`;
  });
}

export async function processSceneCompose(
  input: FileInput,
  options: ToolOptions,
): Promise<FileOutput> {
  const opts = options as SceneComposeOptions;

  // Step 1: Remove background
  const imageBase64 = await fileToBase64(input.file);
  const removeBgResult = await opts.callRemoveBg(imageBase64, opts.apiKey);

  // Step 2: Get scene background (custom upload or AI generated)
  const bgBase64 = opts.customBackgroundBase64
    || (await opts.callGenerateImage({
      prompt: opts.scenePrompt,
      size: '1024x1024',
      quality: 'high',
      n: 1,
      apiKey: opts.apiKey,
    })).images[0];

  // Step 3: Composite using Canvas
  const [cutoutImg, bgImg] = await Promise.all([
    base64ToImage(removeBgResult.resultBase64),
    base64ToImage(bgBase64),
  ]);

  const width = 1024;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Draw background
  ctx.drawImage(bgImg, 0, 0, width, height);

  // Fit cutout into center (preserve aspect ratio, max 80% of canvas)
  const maxW = width * 0.8;
  const maxH = height * 0.8;
  const scale = Math.min(maxW / cutoutImg.width, maxH / cutoutImg.height);
  const drawW = cutoutImg.width * scale;
  const drawH = cutoutImg.height * scale;
  const drawX = (width - drawW) / 2;
  const drawY = (height - drawH) / 2;
  ctx.drawImage(cutoutImg, drawX, drawY, drawW, drawH);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas 导出失败'));
    }, 'image/png');
  });

  const baseName = input.name.replace(/\.[^.]+$/, '');
  return {
    blob,
    name: `${baseName}_scene.png`,
    type: 'image/png',
    size: blob.size,
    url: URL.createObjectURL(blob),
  };
}
