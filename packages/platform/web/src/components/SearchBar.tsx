'use client';
import { useState } from 'react';

export function SearchBar() {
  const [query, setQuery] = useState('');
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="🔍 搜索工具..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-48 md:w-64 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}
