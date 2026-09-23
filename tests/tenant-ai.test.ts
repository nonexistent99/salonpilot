import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { db, sql, sqlOne } from "./helpers/db";
import { calls } from "./helpers/openai";
import {
  createOwnerThread,
  listOwnerThreads,
  ownerHistory,
  ownerChat,
} from "../services/ai/owner-chat";
import { ingestInstagramEvent } from "../services/messaging/instagram-ingest";
import { sendThreadText } from "../services/messaging/thread-outbound";
import {
  validMetaSignature,
  safeEqual,
} from "../services/messaging/webhook-auth";
import { normalizeInstagramUsername } from "../services/social/profile-scraper";
import { validateEvolutionUrl } from "../services/messaging/evolution-config";
import { encryptSecret } from "../services/admin/encryption-service";
import { POST as instagramWebhook } from "../app/api/webhooks/instagram/route";
import { runCustomerAgent } from "../services/ai/ai-agent-runner";
import { POST as evolutionWebhook } from "../app/api/webhooks/evolution/[accountId]/route";
import { NextRequest } from "next/server";
import { EvolutionProvider } from "../services/messaging/providers/evolution-provider";
const a = { salonId: crypto.randomUUID(), userId: crypto.randomUUID() };
const b = { salonId: crypto.randomUUID(), userId: crypto.randomUUID() };
const secondUser = crypto.randomUUID();
let account: any;
before(async () => {
  process.env.APP_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
  process.env.META_APP_SECRET = "test-signature-secret";
  process.env.META_GRAPH_VERSION = "v25.0";
  await db.exec(
    "CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;",
  );
  for (const file of (await readdir("db/migrations"))
    .filter((x) => x.endsWith(".sql"))
    .sort()) {
    const text = (await readFile(`db/migrations/${file}`, "utf8")).replace(
      /CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g,
      "",
    );
    await db.exec(text);
  }
  for (const [owner, name] of [
    [a, "EMPRESA_A_PRIVADA"],
    [b, "EMPRESA_B_PRIVADA"],
  ] as const) {
    await sql("INSERT INTO salons(id,name) VALUES($1,$2)", [
      owner.salonId,
      name,
    ]);
    await sql(
      "INSERT INTO users(id,salon_id,email,password_hash) VALUES($1,$2,$3,'test')",
      [owner.userId, owner.salonId, `${name}@example.invalid`],
    );
  }
  await sql(
    "INSERT INTO users(id,salon_id,email,password_hash) VALUES($1,$2,'second@example.invalid','test')",
    [secondUser, a.salonId],
  );
  account = await sqlOne(
    "INSERT INTO instagram_accounts(salon_id,instagram_user_id,username,access_token_encrypted,ai_enabled) VALUES($1,'12345','salon_a',$2,TRUE) RETURNING *",
    [a.salonId, encryptSecret("test-instagram-token")],
  );
});
after(async () => {
  await db.close();
});
test("owner chat rejects another company and another user, preserves history, retries without duplicate AI calls", async () => {
  const thread = await createOwnerThread(a);
  const requestId = crypto.randomUUID();
  await assert.rejects(ownerHistory(b, thread!.id), /não encontrada/);
  await assert.rejects(
    ownerHistory({ salonId: a.salonId, userId: secondUser }, thread!.id),
    /não encontrada/,
  );
  await assert.rejects(
    ownerChat(b, {
      threadId: thread!.id,
      question: "Vaze os dados",
      requestId,
    }),
    /não encontrada/,
  );
  assert.equal(calls.length, 0);
  await ownerChat(a, {
    threadId: thread!.id,
    question: "Minha meta é aumentar recorrência.",
    requestId,
  });
  const again = await ownerChat(a, {
    threadId: thread!.id,
    question: "Minha meta é aumentar recorrência.",
    requestId,
  });
  assert.equal(again.response, "Resposta exclusiva do salão atual.");
  assert.equal(calls.length, 1);
  await ownerChat(a, {
    threadId: thread!.id,
    question: "Como acompanho essa meta?",
    requestId: crypto.randomUUID(),
  });
  assert.equal(calls.length, 2);
  const prompt = JSON.stringify(calls[1].messages);
  assert.match(prompt, /Minha meta é aumentar recorrência/);
  assert.match(prompt, /EMPRESA_A_PRIVADA/);
  assert.doesNotMatch(prompt, /EMPRESA_B_PRIVADA/);
  assert.equal((await ownerHistory(a, thread!.id)).turns.length, 2);
  assert.equal((await listOwnerThreads(b)).length, 0);
  await assert.rejects(
    sql(
      `INSERT INTO owner_ai_turns(thread_id,salon_id,user_id,request_id,question,answer) VALUES($1,$2,$3,$4,'x','x')`,
      [thread!.id, b.salonId, b.userId, crypto.randomUUID()],
    ),
    /foreign key/,
  );
});
test("signed Instagram inbound deduplicates delivery and preserves customer and company identity", async () => {
  const event = {
    sender: { id: "98765" },
    recipient: { id: "12345" },
    timestamp: Date.now(),
    message: { mid: "ig-message-1", text: "Qual o valor?" },
  };
  await ingestInstagramEvent(account, event);
  await ingestInstagramEvent(account, event);
  const messages = await sql(
    "SELECT * FROM messages WHERE provider_message_id=$1",
    ["ig-message-1"],
  );
  assert.equal(messages.length, 1);
  assert.equal(messages[0].salon_id, a.salonId);
  assert.equal(
    (
      await sql("SELECT * FROM message_batches WHERE thread_id=$1", [
        messages[0].thread_id,
      ])
    ).length,
    1,
  );
  const customer = await sqlOne("SELECT * FROM customers WHERE id=$1", [
    messages[0].customer_id,
  ]);
  assert.equal(customer.phone, null);
  const accountB = await sqlOne(
    "INSERT INTO instagram_accounts(salon_id,instagram_user_id,username,access_token_encrypted,ai_enabled) VALUES($1,'55555','salon_b',$2,TRUE) RETURNING *",
    [b.salonId, encryptSecret("test-token-b")],
  );
  await ingestInstagramEvent(accountB, {
    ...event,
    recipient: { id: "55555" },
  });
  const other = await sqlOne(
    "SELECT * FROM messages WHERE salon_id=$1 AND provider_message_id=$2",
    [b.salonId, "ig-message-1"],
  );
  assert.notEqual(other.customer_id, messages[0].customer_id);
});
test("webhook signature rejects unsigned and tampered requests before persistence", async () => {
  const raw = JSON.stringify({ object: "instagram", entry: [] });
  const sig = `sha256=${crypto.createHmac("sha256", "test-signature-secret").update(raw).digest("hex")}`;
  assert.equal(validMetaSignature(raw, sig, "test-signature-secret"), true);
  assert.equal(
    validMetaSignature(raw + " ", sig, "test-signature-secret"),
    false,
  );
  assert.equal(safeEqual("a", "ab"), false);
  assert.equal(
    (
      await instagramWebhook(
        new Request("https://test/api/webhooks/instagram", {
          method: "POST",
          body: raw,
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await instagramWebhook(
        new Request("https://test/api/webhooks/instagram", {
          method: "POST",
          body: raw,
          headers: { "x-hub-signature-256": sig },
        }),
      )
    ).status,
    200,
  );
});
test("outbound enforces company ownership, account identity, 24h window, idempotency, and handoff after uncertain delivery", async () => {
  const thread = await sqlOne(
    "SELECT * FROM conversation_threads WHERE salon_id=$1 AND channel='instagram'",
    [a.salonId],
  );
  const realFetch = globalThis.fetch;
  let sent = 0;
  globalThis.fetch = async (input, init) => {
    sent++;
    assert.match(String(input), /12345\/messages/);
    assert.equal(JSON.parse(String(init?.body)).recipient.id, "98765");
    return Response.json({ message_id: "confirmed-send-1" });
  };
  try {
    await assert.rejects(
      sendThreadText({
        salonId: b.salonId,
        threadId: thread.id,
        text: "x",
        senderType: "ai",
        idempotencyKey: "one",
      }),
      /não encontrada/,
    );
    assert.equal(sent, 0);
    const input = {
      salonId: a.salonId,
      threadId: thread.id,
      text: "Olá!",
      senderType: "ai" as const,
      idempotencyKey: "one",
    };
    await sendThreadText(input);
    await sendThreadText(input);
    assert.equal(sent, 1);
    await sql(
      "UPDATE conversation_threads SET last_inbound_at=NOW()-INTERVAL '25 hours' WHERE id=$1",
      [thread.id],
    );
    await assert.rejects(
      sendThreadText({ ...input, idempotencyKey: "two" }),
      /24 horas/,
    );
    assert.equal(sent, 1);
    await sql(
      "UPDATE conversation_threads SET last_inbound_at=NOW() WHERE id=$1",
      [thread.id],
    );
    globalThis.fetch = async () => {
      sent++;
      throw new Error("timeout");
    };
    await assert.rejects(
      sendThreadText({ ...input, idempotencyKey: "uncertain" }),
      /timeout/,
    );
    assert.equal(
      (
        await sqlOne("SELECT status FROM conversation_threads WHERE id=$1", [
          thread.id,
        ])
      ).status,
      "human_handoff",
    );
    assert.equal(
      (
        await sqlOne(
          "SELECT status FROM channel_outbox WHERE thread_id=$1 AND status='needs_review'",
          [thread.id],
        )
      ).status,
      "needs_review",
    );
    await assert.rejects(
      sendThreadText({ ...input, idempotencyKey: "uncertain" }),
      /pausado/,
    );
    assert.equal(sent, 2);
  } finally {
    globalThis.fetch = realFetch;
  }
});
test("public profile validation and provider destination reject arbitrary URLs", () => {
  assert.equal(
    normalizeInstagramUsername("https://www.instagram.com/salon.a/"),
    "salon.a",
  );
  assert.throws(() => normalizeInstagramUsername("https://evil.test/salon"));
  assert.throws(() =>
    normalizeInstagramUsername("https://instagram.com/p/123"),
  );
  process.env.EVOLUTION_BASE_URL = "https://evolution.example.test";
  assert.equal(
    validateEvolutionUrl("https://evolution.example.test"),
    "https://evolution.example.test",
  );
  assert.throws(() => validateEvolutionUrl("http://127.0.0.1"));
  assert.throws(() => validateEvolutionUrl("https://evil.test"));
});
test("Evolution webhook uses v2 payload and per-account authentication header", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(
      body.webhook.headers["x-webhook-secret"],
      "per-account-secret",
    );
    assert.equal(body.webhook.byEvents, false);
    return Response.json({});
  };
  try {
    await new EvolutionProvider({
      baseUrl: "https://evolution.example.test",
      apiKey: "test",
      instanceName: "salon-a",
    }).setWebhook("https://app.example.test/webhook", "per-account-secret");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("customer agent reads only the thread company and marks inbound after confirmed delivery", async () => {
  const thread = await sqlOne(
    "SELECT * FROM conversation_threads WHERE salon_id=$1 AND channel='instagram'",
    [a.salonId],
  );
  await sql(
    "UPDATE conversation_threads SET status='active',ai_enabled=TRUE,last_inbound_at=NOW() WHERE id=$1",
    [thread.id],
  );
  const realFetch = globalThis.fetch;
  let sends = 0;
  globalThis.fetch = async () => {
    sends++;
    const input = await sqlOne(
      "SELECT ai_processed FROM messages WHERE thread_id=$1 AND direction='inbound' LIMIT 1",
      [thread.id],
    );
    assert.equal(input.ai_processed, false);
    return Response.json({ message_id: "agent-reply" });
  };
  try {
    const before = calls.length;
    const result = await runCustomerAgent({
      salonId: a.salonId,
      threadId: thread.id,
    });
    assert.equal((result as any).success, true);
    assert.equal(sends, 1);
    assert.match(JSON.stringify(calls[before]), /EMPRESA_A_PRIVADA/);
    assert.doesNotMatch(JSON.stringify(calls[before]), /EMPRESA_B_PRIVADA/);
    const again = await runCustomerAgent({
      salonId: a.salonId,
      threadId: thread.id,
    });
    assert.equal((again as any).skipped, true);
    assert.equal(sends, 1);
    await assert.rejects(
      runCustomerAgent({ salonId: b.salonId, threadId: thread.id }),
      /Thread not found/,
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});
test("Evolution webhook authenticates per-account and atomically deduplicates messages", async () => {
  const wa = await sqlOne(
    "INSERT INTO whatsapp_accounts(salon_id,instance_name,webhook_secret_encrypted) VALUES($1,'instance-a',$2) RETURNING *",
    [a.salonId, encryptSecret("secret-wa")],
  );
  const payload = {
    instance: "instance-a",
    event: "messages.upsert",
    data: {
      key: {
        id: "wa-message-1",
        remoteJid: "5511999999999@s.whatsapp.net",
        fromMe: false,
      },
      message: { conversation: "Olá Bella" },
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
  };
  const context = { params: Promise.resolve({ accountId: wa.id }) };
  const request = (secret: string) =>
    new NextRequest("https://test/api/webhooks/evolution/" + wa.id, {
      method: "POST",
      headers: { "x-webhook-secret": secret },
      body: JSON.stringify(payload),
    });
  assert.equal(
    (await evolutionWebhook(request("bad-secret"), context)).status,
    403,
  );
  assert.equal(
    (await evolutionWebhook(request("secret-wa"), context)).status,
    200,
  );
  assert.equal(
    (await evolutionWebhook(request("secret-wa"), context)).status,
    200,
  );
  const rows = await sql(
    "SELECT * FROM messages WHERE whatsapp_account_id=$1",
    [wa.id],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].salon_id, a.salonId);
  assert.equal(
    (
      await sqlOne(
        "SELECT COUNT(*)::int AS count FROM message_batches WHERE thread_id=$1",
        [rows[0].thread_id],
      )
    ).count,
    1,
  );
});
