import { validateEvolutionUrl } from "./evolution-config";
import { sqlOne } from "@/lib/db/neon";
import { decryptSecret } from "@/services/admin/encryption-service";
import {
  getEvolutionBaseUrl,
  getEvolutionGlobalKey,
} from "@/services/admin/settings-service";
import { EvolutionProvider } from "./providers/evolution-provider";
import { MockMessagingProvider } from "./providers/mock-provider";

export type WhatsAppAccount = {
  webhook_secret_encrypted: string | null;
  id: string;
  salon_id: string;
  provider: string;
  evolution_base_url: string | null;
  instance_name: string;
  instance_token_encrypted: string | null;
  api_key_encrypted: string | null;
  phone_number: string | null;
  status: string;
};

export async function getWhatsAppAccount(accountId: string) {
  return sqlOne<WhatsAppAccount>(
    `SELECT *
     FROM whatsapp_accounts
     WHERE id = $1`,
    [accountId],
  );
}

export async function getMessagingProvider(account: WhatsAppAccount) {
  const baseUrl = account.evolution_base_url || (await getEvolutionBaseUrl());
  const ownKey = decryptSecret(account.api_key_encrypted);
  const globalUrl = await getEvolutionBaseUrl();
  const sameServer =
    baseUrl &&
    globalUrl &&
    new URL(baseUrl).origin === new URL(globalUrl).origin;
  const apiKey = ownKey || (sameServer ? await getEvolutionGlobalKey() : null);

  if (!baseUrl || !apiKey) throw new Error("Evolution API is not configured");
  validateEvolutionUrl(baseUrl, globalUrl);

  return new EvolutionProvider({
    baseUrl,
    apiKey,
    instanceName: account.instance_name,
  });
}
