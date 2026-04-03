'use client';
import { useMemo } from 'react';
import { FileDropHero } from '@/components/FileDropHero';
import { CategoryTabs } from '@/components/CategoryTabs';
import { ToolGrid } from '@/components/ToolGrid';
import { toolRegistry } from '@/lib/tool-registry';
import { useAppStore } from '@/stores/app-store';

export default function HomePage() {
  const { selectedCategory, setSelectedCategory, searchQuery } = useAppStore();

  const tools = useMemo(() => {
    let result = toolRegistry.getByCategory(selectedCategory).map((t) => t.manifest);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [selectedCategory, searchQuery]);

  return (
    <div className="space-y-8">
      <FileDropHero />
      <section className="space-y-4">
        <CategoryTabs selected={selectedCategory} onChange={setSelectedCategory} />
        <ToolGrid tools={tools} />
      </section>
    </div>
  );
}
