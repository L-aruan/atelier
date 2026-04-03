'use client';
import { useMemo, useState, useEffect } from 'react';
import { FileDropHero } from '@/components/FileDropHero';
import { PinnedTools } from '@/components/PinnedTools';
import { RecentTools } from '@/components/RecentTools';
import { CategoryTabs } from '@/components/CategoryTabs';
import { ToolGrid } from '@/components/ToolGrid';
import { toolRegistry } from '@/lib/tool-registry';
import { useAppStore } from '@/stores/app-store';

export default function HomePage() {
  const { selectedCategory, setSelectedCategory, searchQuery } = useAppStore();
  const [gridReady, setGridReady] = useState(false);

  useEffect(() => {
    setGridReady(true);
  }, []);

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
      <PinnedTools />
      <RecentTools />
      <section className="space-y-4">
        <CategoryTabs selected={selectedCategory} onChange={setSelectedCategory} />
        <ToolGrid
          tools={tools}
          isLoading={!gridReady}
          searchActive={Boolean(searchQuery.trim())}
        />
      </section>
    </div>
  );
}
