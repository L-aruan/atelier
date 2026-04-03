'use client';
import Link from 'next/link';
import { Button } from '@atelier/ui-kit';
import { SearchBar } from './SearchBar';
import { useAuth } from '@/lib/auth-context';

export function Navbar() {
  const { user, logout, isLoading } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-blue-600 font-bold text-lg">
              📦 Atelier
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
                工具库
              </Link>
              <Link href="/workflow" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
                工作流
              </Link>
              <span className="text-gray-400 text-sm cursor-not-allowed">我的文件</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <SearchBar />
            {!isLoading &&
              (user ? (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-700 max-w-[140px] truncate" title={user.email}>
                    {user.name || user.email}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={logout}>
                    退出
                  </Button>
                </div>
              ) : (
                <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  登录
                </Link>
              ))}
            <Link
              href="/settings/keys"
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="API Key 设置"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
