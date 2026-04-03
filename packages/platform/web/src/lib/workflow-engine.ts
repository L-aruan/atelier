import type { FileInput, FileOutput, ToolOptions } from '@mediabox/types';
import type { CropRegion } from '@mediabox/engine-image';
import type { Workflow, WorkflowExecution, StepResult, WorkflowStep } from './workflow-types';
import { toolRegistry } from './tool-registry';

export interface WorkflowRunResult {
  outputs: FileOutput[];
  status: 'completed' | 'failed';
  errorMessage?: string;
}

export function outputToInput(output: FileOutput): FileInput {
  const file = new File([output.blob], output.name, { type: output.type });
  return {
    file,
    name: output.name,
    type: output.type,
    size: output.size,
    url: URL.createObjectURL(file),
  };
}

async function loadImageSize(file: File): Promise<{ w: number; h: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('无法读取图片尺寸'));
      i.src = url;
    });
    return { w: img.naturalWidth, h: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function centerCropRegion(w: number, h: number, ratioW: number, ratioH: number): CropRegion {
  const target = ratioW / ratioH;
  const imgRatio = w / h;
  if (imgRatio > target) {
    const cropW = h * target;
    return { x: Math.round((w - cropW) / 2), y: 0, width: Math.round(cropW), height: h };
  }
  const cropH = w / target;
  return { x: 0, y: Math.round((h - cropH) / 2), width: w, height: Math.round(cropH) };
}

function parseAspectPreset(preset: string): { rw: number; rh: number } | null {
  if (preset === 'free') return null;
  const parts = preset.split(':');
  if (parts.length !== 2) return { rw: 1, rh: 1 };
  const rw = parseFloat(parts[0]);
  const rh = parseFloat(parts[1]);
  if (!rw || !rh) return { rw: 1, rh: 1 };
  return { rw, rh };
}

async function buildProcessOptions(
  step: WorkflowStep,
  file: FileInput,
  extraOptions?: ToolOptions,
): Promise<ToolOptions> {
  const merged: ToolOptions = { ...(step.options as ToolOptions), ...extraOptions };

  if (step.toolId !== 'image-crop') {
    return merged;
  }

  const preset = (step.options.aspectPreset as string) || '1:1';
  const { w, h } = await loadImageSize(file.file);

  if (preset === 'free' || preset === '') {
    return { ...merged, region: { x: 0, y: 0, width: w, height: h } };
  }

  const ar = parseAspectPreset(preset);
  if (!ar) {
    return { ...merged, region: { x: 0, y: 0, width: w, height: h } };
  }

  const region = centerCropRegion(w, h, ar.rw, ar.rh);
  return { ...merged, region };
}

export async function executeWorkflow(
  workflow: Workflow,
  initialFiles: FileInput[],
  onProgress: (execution: WorkflowExecution) => void,
  extraOptions?: ToolOptions,
): Promise<WorkflowRunResult> {
  const totalSteps = workflow.steps.length;

  const emit = (partial: {
    status: WorkflowExecution['status'];
    currentStepIndex: number;
    stepResults: StepResult[];
    currentFileName?: string | null;
  }) => {
    onProgress({
      workflowId: workflow.id,
      status: partial.status,
      currentStepIndex: partial.currentStepIndex,
      totalSteps,
      stepResults: partial.stepResults,
      currentFileName: partial.currentFileName ?? null,
    });
  };

  const stepResults: StepResult[] = workflow.steps.map((s) => ({
    stepId: s.id,
    toolId: s.toolId,
    status: 'pending',
    inputCount: 0,
    outputCount: 0,
  }));

  const snap = (): StepResult[] => stepResults.map((r) => ({ ...r }));

  if (totalSteps === 0) {
    emit({ status: 'completed', currentStepIndex: -1, stepResults: snap(), currentFileName: null });
    return { outputs: [], status: 'completed' };
  }

  let currentInputs = [...initialFiles];

  emit({
    status: 'running',
    currentStepIndex: 0,
    stepResults: snap(),
    currentFileName: null,
  });

  for (let si = 0; si < workflow.steps.length; si++) {
    const step = workflow.steps[si];
    const tool = toolRegistry.get(step.toolId);

    for (let j = 0; j < si; j++) {
      stepResults[j] = { ...stepResults[j], status: 'success' };
    }

    stepResults[si] = {
      ...stepResults[si],
      status: 'running',
      inputCount: currentInputs.length,
      outputCount: 0,
    };
    emit({ status: 'running', currentStepIndex: si, stepResults: snap(), currentFileName: null });

    if (!tool) {
      stepResults[si] = {
        ...stepResults[si],
        status: 'failed',
        error: `未找到工具: ${step.toolId}`,
        outputCount: 0,
      };
      emit({ status: 'failed', currentStepIndex: si, stepResults: snap(), currentFileName: null });
      return {
        outputs: [],
        status: 'failed',
        errorMessage: stepResults[si].error ?? '执行失败',
      };
    }

    const nextInputs: FileInput[] = [];
    let firstError: string | undefined;

    for (const input of currentInputs) {
      emit({
        status: 'running',
        currentStepIndex: si,
        stepResults: snap(),
        currentFileName: input.name,
      });

      try {
        const opts = await buildProcessOptions(step, input, extraOptions);
        const output = await tool.process(input, opts);

        if (input.url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(input.url);
          } catch {
            /* ignore */
          }
        }

        try {
          URL.revokeObjectURL(output.url);
        } catch {
          /* ignore */
        }

        nextInputs.push(outputToInput(output));
      } catch (e) {
        if (!firstError) firstError = String(e);
      }

      stepResults[si] = {
        ...stepResults[si],
        outputCount: nextInputs.length,
        inputCount: currentInputs.length,
      };
      emit({
        status: 'running',
        currentStepIndex: si,
        stepResults: snap(),
        currentFileName: input.name,
      });
    }

    const skipped = currentInputs.length - nextInputs.length;
    stepResults[si] = {
      ...stepResults[si],
      status: nextInputs.length > 0 ? 'success' : 'failed',
      inputCount: currentInputs.length,
      outputCount: nextInputs.length,
      error:
        nextInputs.length === 0
          ? firstError ?? '全部失败'
          : skipped > 0
            ? `已跳过 ${skipped} 个失败文件`
            : undefined,
    };

    emit({
      status: nextInputs.length > 0 ? 'running' : 'failed',
      currentStepIndex: si,
      stepResults: snap(),
      currentFileName: null,
    });

    if (nextInputs.length === 0) {
      emit({ status: 'failed', currentStepIndex: si, stepResults: snap(), currentFileName: null });
      return {
        outputs: [],
        status: 'failed',
        errorMessage: stepResults[si].error ?? '全部文件在此步骤失败',
      };
    }

    currentInputs = nextInputs;
  }

  for (let j = 0; j < stepResults.length; j++) {
    stepResults[j] = { ...stepResults[j], status: 'success' };
  }

  emit({
    status: 'completed',
    currentStepIndex: workflow.steps.length - 1,
    stepResults: snap(),
    currentFileName: null,
  });

  return {
    status: 'completed' as const,
    outputs: currentInputs.map((inp) => ({
      blob: inp.file,
      name: inp.name,
      type: inp.type,
      size: inp.size,
      url: inp.url,
    })),
  };
}
