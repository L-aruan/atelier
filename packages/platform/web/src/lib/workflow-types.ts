export interface WorkflowStep {
  id: string;
  toolId: string;
  label: string;
  options: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  isTemplate: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowExecution {
  workflowId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentStepIndex: number;
  totalSteps: number;
  stepResults: StepResult[];
  /** 当前正在处理的文件名（执行引擎进度展示用） */
  currentFileName?: string | null;
}

export interface StepResult {
  stepId: string;
  toolId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  inputCount: number;
  outputCount: number;
  error?: string;
}
