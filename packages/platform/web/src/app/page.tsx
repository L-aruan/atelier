'use client';
import { useState, useMemo } from 'react';
import { FileDropHero } from '@/components/FileDropHero';
import { CategoryTabs } from '@/components/CategoryTabs';
import { ToolGrid } from '@/components/ToolGrid';
import { toolRegistry } from '@/lib/tool-registry';

export default function HomePage() {
  const [category, setCategory] = useState('all');

  const tools = useMemo(
    () => toolRegistry.getByCategory(category).map((t) => t.manifest),
    [category],
  );

  return (
    <div className="space-y-8">
      <FileDropHero />
      <section className="space-y-4">
        <CategoryTabs selected={category} onChange={setCategory} />
        <ToolGrid tools={tools} />
      </section>
    </div>
  );
}
