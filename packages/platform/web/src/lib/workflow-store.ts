import { get, set, del, keys } from 'idb-keyval';
import type { Workflow } from './workflow-types';

const PREFIX = 'workflow:';

function storageKey(id: string): string {
  return `${PREFIX}${id}`;
}

export async function saveWorkflow(workflow: Workflow): Promise<void> {
  await set(storageKey(workflow.id), workflow);
}

export async function loadWorkflow(id: string): Promise<Workflow | null> {
  const w = await get<Workflow>(storageKey(id));
  return w ?? null;
}

export async function deleteWorkflow(id: string): Promise<void> {
  await del(storageKey(id));
}

export async function listWorkflows(): Promise<Workflow[]> {
  const allKeys = await keys<string>();
  const wfKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(PREFIX));
  const workflows: Workflow[] = [];
  for (const k of wfKeys) {
    const w = await get<Workflow>(k);
    if (w && !w.isTemplate) {
      workflows.push(w);
    }
  }
  return workflows.sort((a, b) => b.updatedAt - a.updatedAt);
}
