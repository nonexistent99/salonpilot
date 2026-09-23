'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function ActivateAdmin() {
  const [token,setToken]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const router=useRouter();
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/admin/bootstrap',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Falha ao ativar.');router.push('/admin');router.refresh();}catch(err){setError(err instanceof Error?err.message:'Falha de conexão.')}finally{setBusy(false)}}
  return <main className="min-h-screen grid place-items-center bg-background p-4"><form onSubmit={submit} className="w-full max-w-md border rounded-2xl p-7 space-y-4"><h1 className="text-2xl font-semibold">Ativar administração</h1><p className="text-sm text-muted-foreground">Faça login na conta proprietária e insira o código inicial. Só a primeira ativação é aceita.</p><label className="block text-sm">Código inicial<input type="password" value={token} onChange={e=>setToken(e.target.value)} required className="mt-2 border rounded-xl p-3 w-full"/></label>{error&&<p role="alert" className="text-destructive">{error}</p>}<button disabled={busy} className="rounded-xl bg-primary text-primary-foreground px-5 py-3 disabled:opacity-50">{busy?'Ativando...':'Ativar painel'}</button></form></main>;
}
