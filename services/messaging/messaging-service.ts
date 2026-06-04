import { sqlOne } from '@/lib/db/neon';
import { decryptSecret } from '@/services/admin/encryption-service';
import { getEvolutionBaseUrl, getEvolutionGlobalKey } from '@/services/admin/settings-service';
import { EvolutionProvider } from './providers/evolution-provider';
import { MockMessagingProvider } from './providers/mock-provider';

export type WhatsAppAccount = {
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
    [accountId]
  );
}

export async function getMessagingProvider(account: WhatsAppAccount) {
  if (process.env.MESSAGING_PROVIDER === 'mock') {
    return new MockMessagingProvider();
  }

  const baseUrl = account.evolution_base_url || await getEvolutionBaseUrl();
  const apiKey = decryptSecret(account.api_key_encrypted) || await getEvolutionGlobalKey();

  if (!baseUrl || !apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Evolution API is not configured');
    }
    return new MockMessagingProvider();
  }

  return new EvolutionProvider({
    baseUrl,
    apiKey,
    instanceName: account.instance_name,
  });
}
