"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Loader2 } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const { data: profile } = useSWR("/api/profile", fetcher);

  useEffect(() => {
    if (profile !== undefined) {
      setIsChecking(false);
      // If user is not admin, redirect to home
      if (profile?.role !== "admin") {
        router.push("/");
      }
    }
  }, [profile, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Only render children if user is admin
  if (profile?.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
