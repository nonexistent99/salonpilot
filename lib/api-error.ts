import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function apiError(error: unknown) {
  if (error instanceof ApiError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return NextResponse.json(
      { error: "Dados inválidos. Confira os campos e tente novamente." },
      { status: 400 },
    );
  }
  console.error(
    "[SalonPilot API]",
    error instanceof Error ? error.name : "Unknown error",
  );
  return NextResponse.json(
    {
      error:
        "Não foi possível concluir. Confira a configuração da integração e tente novamente.",
    },
    { status: 503 },
  );
}
