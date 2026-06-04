type EvolutionConfig = {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
};

type SendTextArgs = {
  to: string;
  text: string;
};

function cleanBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

async function evolutionFetch<T>(config: EvolutionConfig, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${cleanBaseUrl(config.baseUrl)}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: config.apiKey,
      ...((init?.headers as Record<string, string> | undefined) || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`Evolution API ${response.status}: ${text.slice(0, 240)}`);
  }

  return data as T;
}

export class EvolutionProvider {
  constructor(private readonly config: EvolutionConfig) {}

  async sendText(args: SendTextArgs) {
    return evolutionFetch(this.config, `/message/sendText/${this.config.instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: args.to,
        text: args.text,
      }),
    });
  }

  async sendImage(args: { to: string; imageUrl: string; caption?: string }) {
    return evolutionFetch(this.config, `/message/sendMedia/${this.config.instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: args.to,
        mediatype: 'image',
        media: args.imageUrl,
        caption: args.caption || '',
      }),
    });
  }

  async sendDocument(args: { to: string; documentUrl: string; fileName?: string; caption?: string }) {
    return evolutionFetch(this.config, `/message/sendMedia/${this.config.instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: args.to,
        mediatype: 'document',
        media: args.documentUrl,
        fileName: args.fileName || 'arquivo.pdf',
        caption: args.caption || '',
      }),
    });
  }

  async getConnectionState() {
    return evolutionFetch(this.config, `/instance/connectionState/${this.config.instanceName}`, {
      method: 'GET',
    });
  }

  async getQRCode() {
    return evolutionFetch(this.config, `/instance/connect/${this.config.instanceName}`, {
      method: 'GET',
    });
  }

  async createInstance() {
    return evolutionFetch(this.config, '/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName: this.config.instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });
  }

  async disconnect() {
    return evolutionFetch(this.config, `/instance/logout/${this.config.instanceName}`, {
      method: 'DELETE',
    });
  }

  async setWebhook(webhookUrl: string) {
    return evolutionFetch(this.config, `/webhook/set/${this.config.instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        url: webhookUrl,
        enabled: true,
        webhook_by_events: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
      }),
    });
  }
}
