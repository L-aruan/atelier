'use client';

import { useState, useCallback } from 'react';
import { Button } from '@atelier/ui-kit';
import type { Workflow, WorkflowStep } from '@/lib/workflow-types';
import { toolRegistry } from '@/lib/tool-registry';
import type { ImageFormat } from '@atelier/engine-image';
import { WorkflowStepCard } from './WorkflowStepCard';
import { WorkflowToolPicker } from './WorkflowToolPicker';

interface WorkflowEditorProps {
  workflow: Workflow;
  onChange: (workflow: Workflow) => void;
  onExecute: () => void;
  onSave: () => void;
}

function defaultOptionsForTool(toolId: string): Record<string, unknown> {
  switch (toolId) {
    case 'image-crop':
      return { aspectPreset: '1:1' };
    case 'image-compress':
      return { quality: 0.8, maxSizeMB: 1, maxWidthOrHeight: 1920 };
    case 'image-format':
      return { targetFormat: 'image/webp' as ImageFormat, quality: 0.92 };
    default:
      return {};
  }
}

export function WorkflowEditor({ workflow, onChange, onExecute, onSave }: WorkflowEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const updateStep = useCallback(
    (index: number, step: WorkflowStep) => {
      const steps = [...workflow.steps];
      steps[index] = step;
      onChange({ ...workflow, steps, updatedAt: Date.now() });
    },
    [workflow, onChange],
  );

  const removeStep = useCallback(
    (index: number) => {
      const steps = workflow.steps.filter((_, i) => i !== index);
      onChange({ ...workflow, steps, updatedAt: Date.now() });
    },
    [workflow, onChange],
  );

  const moveStep = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= workflow.steps.length) return;
      const steps = [...workflow.steps];
      const [item] = steps.splice(from, 1);
      steps.splice(to, 0, item);
      onChange({ ...workflow, steps, updatedAt: Date.now() });
    },
    [workflow, onChange],
  );

  const addTool = useCallback(
    (toolId: string) => {
      const tool = toolRegistry.get(toolId);
      const step: WorkflowStep = {
        id: crypto.randomUUID(),
        toolId,
        label: tool?.manifest.name ?? toolId,
        options: defaultOptionsForTool(toolId),
      };
      onChange({
        ...workflow,
        steps: [...workflow.steps, step],
        updatedAt: Date.now(),
      });
      setPickerOpen(false);
    },
    [workflow, onChange],
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">工作流名称</label>
          <input
            type="text"
            value={workflow.name}
            onChange={(e) => onChange({ ...workflow, name: e.target.value, updatedAt: Date.now() })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <textarea
            value={workflow.description}
            onChange={(e) => onChange({ ...workflow, description: e.target.value, updatedAt: Date.now() })}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y min-h-[60px]"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">步骤</h3>
        {workflow.steps.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-xl">
            暂无步骤，点击下方按钮添加
          </p>
        ) : (
          <div className="space-y-2">
            {workflow.steps.map((step, index) => (
              <div key={step.id}>
                {index > 0 && (
                  <div className="flex justify-center py-1 text-gray-400 text-lg select-none" aria-hidden>
                    →
                  </div>
                )}
                <WorkflowStepCard
                  step={step}
                  index={index}
                  totalSteps={workflow.steps.length}
                  onUpdate={(s) => updateStep(index, s)}
                  onRemove={() => removeStep(index)}
                  onMoveUp={() => moveStep(index, index - 1)}
                  onMoveDown={() => moveStep(index, index + 1)}
                />
              </div>
            ))}
          </div>
        )}

        <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)} className="w-full sm:w-auto">
          + 添加步骤
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
        <Button type="button" variant="secondary" onClick={onSave}>
          保存
        </Button>
        <Button type="button" onClick={onExecute} disabled={workflow.steps.length === 0}>
          执行
        </Button>
      </div>

      {pickerOpen && <WorkflowToolPicker onSelect={addTool} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
