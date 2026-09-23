'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Loader2, ShieldCheck, Sparkles } from 'lucide-react';

const plans = {
  starter: { name: 'Essencial', price: 97, description: 'Clareza para crescer todos os dias', features: ['Diagnóstico do salão com dados reais', 'Coach IA e prioridades práticas', 'Ideias de conteúdo para Instagram'] },
  enterprise: { name: 'Crescimento', price: 497, description: 'Mais capacidade para executar e medir', features: ['Tudo do Essencial', 'Estratégias e campanhas orientadas por dados', 'Acompanhamento de resultados'] },
} as const;

function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get('plan');
  const [selected, setSelected] = useState<'starter' | 'enterprise'>(initial === 'enterprise' ? 'enterprise' : 'starter');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const plan = plans[selected];

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selected, name, phone: `55${phone.replace(/\D/g, '').replace(/^55/, '')}`, document }),
      });
      const data = await res.json();
      if (res.status === 401) { router.push(`/auth/sign-up?plan=${selected}`); return; }
      if (!res.ok) throw new Error(data.error || 'Não foi possível continuar.');
      if (!data.url || !/^https:\/\/pay\.sunize\.com\.br\//.test(data.url)) throw new Error('Link de pagamento inválido.');
      window.location.assign(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha de conexão.'); setBusy(false); }
  }

  return <main className="min-h-screen bg-[#f7f5f1] text-[#222922] px-5 py-8">
    <div className="max-w-5xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-[#5d695b] mb-10"><ArrowLeft size={17}/> Voltar</button>
      <div className="flex items-center gap-2 text-[#397253] font-semibold mb-4"><Sparkles size={20}/> SalonPilot</div>
      <h1 className="text-4xl font-semibold tracking-tight mb-2">Seu próximo ciclo de crescimento</h1>
      <p className="text-[#647063] mb-9">Escolha seu plano e autorize uma única vez o Pix Automático mensal.</p>
      <div className="grid lg:grid-cols-[1fr_0.9fr] gap-8 items-start">
        <section className="space-y-4" aria-label="Planos">
          {(Object.keys(plans) as Array<keyof typeof plans>).map(id => <button key={id} type="button" onClick={() => setSelected(id)} className={`w-full text-left rounded-2xl border-2 p-6 bg-white transition-shadow hover:shadow-md ${selected === id ? 'border-[#397253] shadow-md' : 'border-[#e2e7df]'}`}>
            <div className="flex justify-between gap-4 items-start"><div><h2 className="text-xl font-semibold">{plans[id].name}</h2><p className="text-sm text-[#677466] mt-1">{plans[id].description}</p></div><div className="text-right whitespace-nowrap"><strong className="text-2xl">R$ {plans[id].price}</strong><span className="text-sm text-[#677466]">/mês</span></div></div>
            <ul className="mt-5 space-y-2">{plans[id].features.map(feature => <li key={feature} className="flex items-start gap-2 text-sm"><Check size={17} className="text-[#397253] shrink-0"/>{feature}</li>)}</ul>
          </button>)}
        </section>
        <form onSubmit={subscribe} className="rounded-2xl border border-[#e2e7df] bg-white p-7 shadow-sm space-y-5">
          <div><h2 className="text-xl font-semibold">Dados para assinatura</h2><p className="text-sm text-[#677466] mt-1">A autorização acontece no ambiente seguro da Sunize.</p></div>
          <label className="block text-sm font-medium">Nome completo<input required minLength={3} autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="block mt-2 w-full rounded-lg border border-[#cbd5c9] px-4 py-3 outline-none focus:border-[#397253]" placeholder="Seu nome"/></label>
          <label className="block text-sm font-medium">Celular com DDD<input required inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} className="block mt-2 w-full rounded-lg border border-[#cbd5c9] px-4 py-3 outline-none focus:border-[#397253]" placeholder="11 99999-9999"/></label>
          <label className="block text-sm font-medium">CPF<input required inputMode="numeric" value={document} onChange={e => setDocument(e.target.value)} className="block mt-2 w-full rounded-lg border border-[#cbd5c9] px-4 py-3 outline-none focus:border-[#397253]" placeholder="000.000.000-00"/></label>
          <div className="border-t pt-5 flex justify-between"><span>Total recorrente</span><strong>R$ {plan.price},00 / mês</strong></div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-[#397253] hover:bg-[#2d5f45] text-white py-4 font-semibold flex justify-center items-center gap-2 disabled:opacity-60">{busy && <Loader2 size={18} className="animate-spin"/>} Autorizar Pix Automático</button>
          <p className="flex gap-2 text-xs text-[#677466]"><ShieldCheck size={16} className="shrink-0"/> O acesso ao plano começa após a Sunize confirmar a autorização. Cobrança mensal recorrente.</p>
        </form>
      </div>
    </div>
  </main>;
}

export default function CheckoutPage() { return <Suspense><CheckoutContent/></Suspense>; }
