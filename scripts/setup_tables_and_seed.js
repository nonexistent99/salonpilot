process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import pg from "pg";

const { Client } = pg;
const connStr = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
const client = new Client({ connectionString: connStr });

await client.connect();

// 1. Create public_leads_base table
await client.query(`
  CREATE TABLE IF NOT EXISTS public.public_leads_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    city TEXT NOT NULL,
    niche TEXT NOT NULL,
    rating NUMERIC DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
  );
`);
await client.query(`ALTER TABLE public.public_leads_base ENABLE ROW LEVEL SECURITY;`);
await client.query(`DROP POLICY IF EXISTS "public_leads_base_read_all" ON public.public_leads_base;`);
await client.query(`CREATE POLICY "public_leads_base_read_all" ON public.public_leads_base FOR SELECT USING (true);`);

// 2. Create music_projects table
await client.query(`
  CREATE TABLE IF NOT EXISTS public.music_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    niche TEXT,
    style TEXT,
    tone TEXT,
    lyrics TEXT,
    short_version TEXT,
    slogan TEXT,
    alt_version TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
`);
await client.query(`ALTER TABLE public.music_projects ENABLE ROW LEVEL SECURITY;`);
await client.query(`DROP POLICY IF EXISTS "music_projects_select" ON public.music_projects;`);
await client.query(`CREATE POLICY "music_projects_select" ON public.music_projects FOR SELECT USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);`);
await client.query(`DROP POLICY IF EXISTS "music_projects_insert" ON public.music_projects;`);
await client.query(`CREATE POLICY "music_projects_insert" ON public.music_projects FOR INSERT WITH CHECK (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);`);
await client.query(`DROP POLICY IF EXISTS "music_projects_delete" ON public.music_projects;`);
await client.query(`CREATE POLICY "music_projects_delete" ON public.music_projects FOR DELETE USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);`);

// 3. Add music columns to subscriptions
await client.query(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='music_used') THEN
      ALTER TABLE public.subscriptions ADD COLUMN music_used INTEGER DEFAULT 0;
    END IF;
  END $$;
`);
await client.query(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='music_limit') THEN
      ALTER TABLE public.subscriptions ADD COLUMN music_limit INTEGER DEFAULT 3;
    END IF;
  END $$;
`);

console.log("Tables and policies created successfully.");

// 4. Seed public_leads_base
const { rows: existing } = await client.query("SELECT count(*) as c FROM public.public_leads_base");
if (parseInt(existing[0].c) > 50) {
  console.log("Already seeded. Skipping.");
} else {
  console.log("Seeding 1000 leads...");

  const cities = ["Sao Paulo","Rio de Janeiro","Belo Horizonte","Curitiba","Salvador","Fortaleza","Brasilia","Recife","Porto Alegre","Goiania"];
  const niches = [
    {n:"Dentista",p:["Clinica Odontologica","Consultorio Dental","Odonto","Sorriso","OdontoCenter","Clinica do Sorriso","Oral Plus","Dental Care","OdontoVida","SmileCenter"]},
    {n:"Clinica Medica",p:["Clinica","Centro Medico","Saude Total","MediCenter","Instituto","Policlinica","Clinica Vida","MedSaude","Centro de Saude","VidaMed"]},
    {n:"Academia",p:["Academia","Gym","Fitness","CrossFit","Body Fitness","Power Gym","Force","Training Center","FitCenter","Evolution Gym"]},
    {n:"Restaurante",p:["Restaurante","Cantina","Sabores","Casa do Chef","Grill House","Bistro","Cozinha da","Fogao de Ouro","Delicia","Tempero Caseiro"]},
    {n:"Loja de Construcao",p:["Material de Construcao","Constrular","ConstruCenter","Casa e Obra","Deposito Central","TijolaoMais","ConstruFacil","Obra Certa","MaterCon","FerraCon"]},
    {n:"Salao de Beleza",p:["Salao","Studio","Beauty Center","Beleza Pura","Hair Design","Espaco Beauty","Visual Novo","Glamour","Estilo Unico","Charme Studio"]},
    {n:"Oficina Mecanica",p:["Auto Mecanica","Oficina","Car Service","Auto Center","Retifica","MecCenter","Auto Eletrica","Funilaria","Auto Pecas","Mecanica Rapida"]},
    {n:"Petshop",p:["PetShop","Mundo Animal","Pet Center","Amigo Pet","Animais e Cia","Canil Real","PetVida","Bichinho Feliz","Casa dos Bichos","VetPet"]},
    {n:"Loja de Roupas",p:["Moda","Fashion Store","Boutique","Look Novo","Style Center","Closet","Tendencia","Elegance","VistaBem","RoupasPlus"]},
    {n:"Padaria",p:["Padaria","Panificadora","Pao Quente","Confeitaria","Doce Sabor","Padoca do Bairro","Forno de Ouro","Casa do Pao","PanCenter","Pao e Cia"]}
  ];
  const surnames = ["Silva","Santos","Oliveira","Souza","Pereira","Costa","Rodrigues","Almeida","Nascimento","Lima","Araujo","Fernandes","Carvalho","Gomes","Martins","Rocha","Ribeiro","Barbosa","Moura","Cardoso"];
  const ddds = ["11","21","31","41","71","85","61","81","51","62"];

  const leads = [];
  for (let i = 0; i < 1000; i++) {
    const ni = niches[i % niches.length];
    const ci = cities[i % cities.length];
    const pf = ni.p[Math.floor(Math.random()*ni.p.length)];
    const sn = surnames[Math.floor(Math.random()*surnames.length)];
    const nm = `${pf} ${sn}`;
    const dd = ddds[i % 10];
    const ph = `(${dd}) 9${String(Math.floor(Math.random()*9000+1000))}-${String(Math.floor(Math.random()*9000+1000))}`;
    const rt = +(3 + Math.random()*2).toFixed(1);
    const rv = Math.floor(Math.random()*400)+2;
    leads.push([nm, ph, ci, ni.n, rt, rv]);
  }

  for (let i = 0; i < leads.length; i += 50) {
    const chunk = leads.slice(i, i+50);
    const vals = chunk.map((_, idx) => {
      const o = idx*6;
      return `($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6})`;
    }).join(",");
    const pars = chunk.flat();
    await client.query(`INSERT INTO public.public_leads_base (name,phone,city,niche,rating,reviews_count) VALUES ${vals}`, pars);
  }
  console.log("Inserted 1000 leads.");
}

await client.end();
console.log("Done!");
