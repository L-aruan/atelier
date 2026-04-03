'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@atelier/ui-kit';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import { WORKFLOW_TEMPLATES, createFromTemplate } from '@/lib/workflow-templates';
import { listWorkflows, deleteWorkflow, saveWorkflow } from '@/lib/workflow-store';
import type { Workflow } from '@/lib/workflow-types';

export default function WorkflowListPage() {
  const router = useRouter();
  const [saved, setSaved] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await listWorkflows();
    setSaved(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const handleUseTemplate = async (templateId: string) => {
    const w = createFromTemplate(templateId);
    if (!w) return;
    await saveWorkflow(w);
    await refresh();
    router.push(`/workflow/${w.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此工作流？')) return;
    await deleteWorkflow(id);
    await refresh();
  };

  if (loading) {
    return (
      <div className="space-y-10">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-gray-100" />
        <ListSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工作流</h1>
          <p className="text-gray-500 text-sm mt-1">组合多个工具，批量处理媒体文件</p>
        </div>
        <Link href="/workflow/new">
          <Button type="button">+ 新建工作流</Button>
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">预设模板</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {WORKFLOW_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col"
            >
              <h3 className="font-medium text-gray-900">{tpl.name}</h3>
              <p className="text-sm text-gray-500 mt-1 flex-1">{tpl.description}</p>
              <p className="text-xs text-gray-400 mt-2">{tpl.steps.length} 个步骤</p>
              <Button type="button" className="mt-4 w-full" onClick={() => handleUseTemplate(tpl.id)}>
                使用模板
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">我的工作流</h2>
        {saved.length === 0 ? (
          <EmptyState
            icon="🗂️"
            title="暂无保存的工作流"
            description="新建一个工作流，或从上方预设模板快速开始。"
            action={{
              label: '新建工作流',
              onClick: () => router.push('/workflow/new'),
            }}
          />
        ) : (
          <ul className="space-y-3">
            {saved.map((w) => (
              <li
                key={w.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between border border-gray-200 rounded-xl p-4 bg-white"
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900">{w.name}</div>
                  <div className="text-sm text-gray-500 truncate">{w.description || '无描述'}</div>
                  <div className="text-xs text-gray-400 mt-1">{w.steps.length} 个步骤</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link href={`/workflow/${w.id}`}>
                    <Button type="button" variant="secondary" size="sm">
                      编辑
                    </Button>
                  </Link>
                  <Button type="button" variant="secondary" size="sm" onClick={() => handleDelete(w.id)}>
                    删除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
