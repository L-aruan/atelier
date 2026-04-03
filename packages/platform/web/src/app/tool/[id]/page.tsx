'use client';
import { ToolPageShell } from '@/components/ToolPageShell';

export default function ToolPage({ params }: { params: { id: string } }) {
  return <ToolPageShell toolId={params.id} />;
}
