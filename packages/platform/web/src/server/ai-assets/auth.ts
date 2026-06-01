import type { NextRequest } from 'next/server';
import { verifyToken } from '@/server/auth';

export async function getRequestUserId(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const queryToken = req.nextUrl.searchParams.get('token');
  const token = bearerToken || queryToken;

  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId || null;
}
