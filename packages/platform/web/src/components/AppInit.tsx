'use client';
import { useEffect, useRef } from 'react';
import { registerAllTools } from '@/lib/register-tools';

export function AppInit() {
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      registerAllTools();
      initialized.current = true;
    }
  }, []);
  return null;
}
