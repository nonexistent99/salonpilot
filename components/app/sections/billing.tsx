'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';

const plans = [
  { id: 'starter', name: 'Essencial', price: 97, description: 'Decisões melhores para o dia a dia do salão.', features: ['Coach IA com dados do salão', 'Prioridades práticas', 'Conteúdo para Instagram'] },
  { id: 'enterprise', name: 'Crescimento', price: 497, description: 'Estratégia e acompanhamento para crescer.', features: ['Tudo do Essencial', 'Campanhas orientadas por dados', 'Análise de resultados'] },
];

export function BillingSection() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR('/api/billing/subscription', fetcher);
  const subscription = data?.subscription;
  return <section className="space-y-7">
    <div><h2 className="text-2xl font-semibold">Assinatura SalonPilot</h2><p className="text-muted-foreground mt-1">Planos mensais com Pix Automático.</p></div>
    <div className="rounded-xl border border-border p-5 bg-card">
      <p className="text-sm text-muted-foreground">Situação atual</p>
      {isLoading ? <p>Carregando assinatura...</p> : error ? <p>Não foi possível consultar sua assinatura.</p> : <p className="font-medium mt-1">{subscription?.status === 'ACTIVE' ? `Plano ${plans.find(p => p.id === subscription.plan)?.name || subscription.plan} ativo` : subscription?.status === 'PENDING_AUTHORIZATION' ? 'Aguardando autorização do Pix Automático' : subscription?.status === 'LATE' ? 'Pagamento em atraso' : subscription?.status === 'CANCELED' ? 'Assinatura cancelada' : 'Sem assinatura ativa'}</p>}
      {subscription?.next_payment_date && <p className="text-sm text-muted-foreground mt-1">Próxima cobrança: {new Date(subscription.next_payment_date).toLocaleDateString('pt-BR')}</p>}
    </div>
    <div className="grid md:grid-cols-2 gap-5">{plans.map(plan => <article key={plan.id} className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4">
      <div><h3 className="text-xl font-semibold">{plan.name}</h3><p className="text-sm text-muted-foreground">{plan.description}</p></div>
      <p><strong className="text-3xl">R$ {plan.price}</strong><span className="text-muted-foreground"> / mês</span></p>
      <ul className="space-y-2 flex-1">{plan.features.map(feature => <li key={feature} className="flex gap-2 text-sm"><CheckCircle2 size={17} className="text-primary shrink-0"/>{feature}</li>)}</ul>
      <button onClick={() => router.push(`/checkout?plan=${plan.id}`)} disabled={subscription?.status === 'ACTIVE' || subscription?.status === 'PENDING_AUTHORIZATION'} className="rounded-lg bg-primary px-5 py-3 text-primary-foreground font-medium disabled:opacity-50">{subscription?.status === 'ACTIVE' ? 'Assinatura ativa' : subscription?.status === 'PENDING_AUTHORIZATION' ? 'Autorização pendente' : 'Escolher plano'}</button>
    </article>)}</div>
  </section>;
}
