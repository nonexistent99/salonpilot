import { testConnection, query } from "@/lib/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  const startTime = Date.now();

  try {
    // Test direct PostgreSQL connection
    const isConnected = await testConnection();
    const responseTime = Date.now() - startTime;

    if (!isConnected) {
      return NextResponse.json(
        {
          status: "error",
          message: "Database connection failed",
          responseTime,
          timestamp: new Date().toISOString(),
          details: {
            type: "connection_failed",
            recovery: "Verifique se a instância Supabase foi reativada ou tente novamente",
          },
        },
        { status: 503 }
      );
    }

    // If connected, try a simple query to ensure database is responsive
    try {
      await query("SELECT 1");
    } catch (queryError) {
      console.error("[v0] Health check query failed:", queryError);
      return NextResponse.json(
        {
          status: "error",
          message: "Database query failed",
          responseTime,
          timestamp: new Date().toISOString(),
          details: {
            type: "query_failed",
            recovery: "O banco de dados pode estar indisponível ou pausado",
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "ok",
      message: "Database connection healthy",
      responseTime,
      timestamp: new Date().toISOString(),
      database: {
        healthy: true,
        type: "PostgreSQL (Direct Connection)",
      },
    });
  } catch (error) {
    console.error("[v0] Health check error:", error);
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "error",
        message: "Health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime,
        timestamp: new Date().toISOString(),
        details: {
          type: "unknown",
          recovery: "Tente recarregar a página ou acesse https://app.supabase.com",
        },
      },
      { status: 503 }
    );
  }
}
