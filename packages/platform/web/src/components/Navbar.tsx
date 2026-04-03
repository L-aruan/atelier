'use client';
import Link from 'next/link';
import { SearchBar } from './SearchBar';

export function Navbar() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-blue-600 font-bold text-lg">
              📦 MediaBox
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
                工具库
              </Link>
              <span className="text-gray-400 text-sm cursor-not-allowed">工作流</span>
              <span className="text-gray-400 text-sm cursor-not-allowed">我的文件</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <SearchBar />
          </div>
        </div>
      </div>
    </header>
  );
}
