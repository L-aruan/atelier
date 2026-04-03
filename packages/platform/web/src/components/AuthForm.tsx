'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@mediabox/ui-kit';
import { trpc } from '@/lib/trpc-client';
import { useAuth } from '@/lib/auth-context';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const registerMutation = trpc.user.register.useMutation();
  const loginMutation = trpc.user.login.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (mode === 'register') {
        const result = await registerMutation.mutateAsync({ email, password, name: name || undefined });
        login(result.token, result.user);
      } else {
        const result = await loginMutation.mutateAsync({ email, password });
        login(result.token, result.user);
      }
      router.push('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '操作失败';
      setError(message);
    }
  };

  const isLoading = registerMutation.isPending || loginMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
      <h1 className="text-2xl font-bold text-center text-gray-900">
        {mode === 'login' ? '登录' : '注册'}
      </h1>

      {mode === 'register' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="你的昵称（可选）"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder={mode === 'register' ? '至少 6 位' : ''}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
      </Button>

      <p className="text-center text-sm text-gray-500">
        {mode === 'login' ? (
          <>
            没有账号？
            <a href="/register" className="text-blue-600 hover:underline">
              注册
            </a>
          </>
        ) : (
          <>
            已有账号？
            <a href="/login" className="text-blue-600 hover:underline">
              登录
            </a>
          </>
        )}
      </p>
    </form>
  );
}
