"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
export default function SignUpPage() {
  const router = useRouter();
  const [form,setForm]=useState({name:'',salonName:'',email:'',password:'',phone:'',city:''});
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');try{
    const res=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form),credentials:'include'});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'Não foi possível criar sua conta.');const plan = new URLSearchParams(window.location.search).get('plan'); router.push(plan === 'enterprise' || plan === 'starter' ? `/setup?plan=${plan}` : '/setup');router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Falha de conexão.')}finally{setBusy(false)}}
  return <main className="min-h-screen grid place-items-center bg-background p-4"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border bg-card p-7 space-y-4"><h1 className="text-2xl font-bold">Comece no SalonPilot</h1><p className="text-muted-foreground text-sm">Crie sua conta e configure a assistente do salão antes de conectá-la ao WhatsApp.</p>{([['name','Seu nome'],['salonName','Nome do salão'],['email','E-mail'],['phone','Telefone do salão'],['city','Cidade'],['password','Senha (mínimo 8 caracteres)']] as const).map(([key,label])=><label key={key} className="block text-sm font-medium">{label}<input required value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} type={key==='password'?'password':key==='email'?'email':'text'} minLength={key==='password'?8:undefined} className="mt-1 w-full rounded-xl border bg-background px-4 py-3"/></label>)}{error&&<p role="alert" className="text-destructive text-sm">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50">{busy?'Criando conta...':'Criar conta e configurar salão'}</button><p className="text-sm text-center">Já tem conta? <Link className="text-primary" href="/auth/login">Entrar</Link></p></form></main>;
}
