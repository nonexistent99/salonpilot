import Link from "next/link";
import { Zap, ArrowRight } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-radial-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-destructive/10 mx-auto mb-4">
          <Zap className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Erro de autenticacao
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Algo deu errado durante a autenticacao. Por favor, tente novamente.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors items-center gap-2"
        >
          Voltar ao Login
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
