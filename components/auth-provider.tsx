'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      // Don't check auth for public routes
      if (
        pathname.startsWith('/auth') ||
        pathname.startsWith('/status') ||
        pathname.startsWith('/checkout') ||
        pathname.startsWith('/api')
      ) {
        return;
      }

      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          router.push('/auth/login');
        }
      } catch (error) {
        console.log('[GrowthOS] Auth check error:', error);
      }
    };

    checkAuth();
  }, [pathname, router]);

  return <>{children}</>;
}
