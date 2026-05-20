process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import pg from "pg";
const { Client } = pg;
const connStr = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
const client = new Client({ connectionString: connStr });
await client.connect();

// Check subscriptions columns
const { rows: subCols } = await client.query(`
  SELECT column_name, data_type, column_default
  FROM information_schema.columns 
  WHERE table_schema='public' AND table_name='subscriptions'
  ORDER BY ordinal_position;
`);
console.log("=== subscriptions columns ===");
subCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} (default: ${c.column_default})`));

// Check leads columns
const { rows: leadCols } = await client.query(`
  SELECT column_name, data_type, column_default
  FROM information_schema.columns 
  WHERE table_schema='public' AND table_name='leads'
  ORDER BY ordinal_position;
`);
console.log("\n=== leads columns ===");
leadCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} (default: ${c.column_default})`));

// Check all tables
const { rows: tables } = await client.query(`
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema='public' 
  ORDER BY table_name;
`);
console.log("\n=== tables ===");
tables.forEach(t => console.log(`  ${t.table_name}`));

// Check agencies columns
const { rows: agCols } = await client.query(`
  SELECT column_name, data_type, column_default
  FROM information_schema.columns 
  WHERE table_schema='public' AND table_name='agencies'
  ORDER BY ordinal_position;
`);
console.log("\n=== agencies columns ===");
agCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} (default: ${c.column_default})`));

await client.end();
