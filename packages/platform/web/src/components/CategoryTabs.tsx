'use client';
import { clsx } from 'clsx';
import { categoryLabels } from '@atelier/ui-kit';

interface CategoryTabsProps {
  selected: string;
  onChange: (category: string) => void;
}

const categories = ['all', 'image', 'video', 'design', 'audio', 'document', 'ai'] as const;

export function CategoryTabs({ selected, onChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={clsx(
            'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
            selected === cat
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          {cat === 'all' ? '全部' : categoryLabels[cat] || cat}
        </button>
      ))}
    </div>
  );
}
