"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DebugPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      console.log("[v0] Testing Supabase connection...");
      
      // Test 1: Basic auth check
      const { data, error } = await supabase.auth.getUser();
      console.log("[v0] Auth check result:", { data, error });
      
      setResult({
        timestamp: new Date().toISOString(),
        test: "auth.getUser()",
        success: !error,
        data,
        error: error?.message,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) + "...",
      });
    } catch (err) {
      console.error("[v0] Connection test error:", err);
      setResult({
        timestamp: new Date().toISOString(),
        test: "connection",
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Debug Page</h1>
        
        <button
          onClick={testConnection}
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? "Testing..." : "Test Connection"}
        </button>

        {result && (
          <pre className="mt-6 p-4 bg-secondary/50 border border-border rounded-lg overflow-auto max-h-96 text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}

        <div className="mt-8 p-4 bg-secondary/30 border border-border rounded-lg">
          <h2 className="font-semibold mb-2">Environment Variables:</h2>
          <ul className="space-y-1 text-sm">
            <li>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
