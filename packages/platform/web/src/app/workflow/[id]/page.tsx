'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WorkflowEditor } from '@/components/WorkflowEditor';
import { WorkflowRunner } from '@/components/WorkflowRunner';
import { loadWorkflow, saveWorkflow } from '@/lib/workflow-store';
import type { Workflow } from '@/lib/workflow-types';

function blankWorkflow(): Workflow {
  const t = Date.now();
  return {
    id: 'new',
    name: '未命名工作流',
    description: '',
    steps: [],
    isTemplate: false,
    createdAt: t,
    updatedAt: t,
  };
}

export default function WorkflowEditPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'edit' | 'run'>('edit');
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (id === 'new') {
        if (!cancelled) setWorkflow(blankWorkflow());
        setLoading(false);
        return;
      }
      const w = await loadWorkflow(id);
      if (!cancelled) {
        setWorkflow(w ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!workflow) return;
    let toSave = workflow;
    if (workflow.id === 'new') {
      const newId = crypto.randomUUID();
      toSave = { ...workflow, id: newId, updatedAt: Date.now() };
      setWorkflow(toSave);
    } else {
      toSave = { ...workflow, updatedAt: Date.now() };
      setWorkflow(toSave);
    }
    await saveWorkflow(toSave);
    if (workflow.id === 'new') {
      router.replace(`/workflow/${toSave.id}`);
    }
  }, [workflow, router]);

  const handleExecute = useCallback(() => {
    setRunKey((k) => k + 1);
    setMode('run');
  }, []);

  const handleRunnerBack = useCallback(() => {
    setMode('edit');
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-gray-500">加载中…</div>;
  }

  if (!workflow) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">工作流不存在</p>
        <Link href="/workflow" className="text-blue-600 hover:underline">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/workflow" className="text-sm text-gray-500 hover:text-gray-700">
          ← 返回
        </Link>
        {mode === 'run' && <span className="text-sm text-blue-600 font-medium">执行工作流</span>}
      </div>

      {mode === 'edit' ? (
        <WorkflowEditor
          workflow={workflow}
          onChange={setWorkflow}
          onExecute={handleExecute}
          onSave={handleSave}
        />
      ) : (
        <WorkflowRunner
          key={runKey}
          workflow={workflow}
          files={[]}
          onComplete={() => {}}
          onBack={handleRunnerBack}
        />
      )}
    </div>
  );
}
