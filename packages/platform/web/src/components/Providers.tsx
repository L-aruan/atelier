'use client';
import { TRPCProvider } from '@/lib/trpc-client';
import { AuthProvider } from '@/lib/auth-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <AuthProvider>{children}</AuthProvider>
    </TRPCProvider>
  );
}
