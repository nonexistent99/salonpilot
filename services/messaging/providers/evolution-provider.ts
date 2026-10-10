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
  return baseUrl.replace(/\/+$/, "");
}

async function evolutionFetch<T>(
  config: EvolutionConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${cleanBaseUrl(config.baseUrl)}${path}`, {
    ...init,
    signal: AbortSignal.timeout(15000),
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
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
    return evolutionFetch(
      this.config,
      `/message/sendText/${encodeURIComponent(this.config.instanceName)}`,
      {
        method: "POST",
        body: JSON.stringify({
          number: args.to,
          text: args.text,
        }),
      },
    );
  }

  async sendImage(args: { to: string; imageUrl: string; caption?: string }) {
    return evolutionFetch(
      this.config,
      `/message/sendMedia/${encodeURIComponent(this.config.instanceName)}`,
      {
        method: "POST",
        body: JSON.stringify({
          number: args.to,
          mediatype: "image",
          media: args.imageUrl,
          caption: args.caption || "",
        }),
      },
    );
  }

  async sendDocument(args: {
    to: string;
    documentUrl: string;
    fileName?: string;
    caption?: string;
  }) {
    return evolutionFetch(
      this.config,
      `/message/sendMedia/${encodeURIComponent(this.config.instanceName)}`,
      {
        method: "POST",
        body: JSON.stringify({
          number: args.to,
          mediatype: "document",
          media: args.documentUrl,
          fileName: args.fileName || "arquivo.pdf",
          caption: args.caption || "",
        }),
      },
    );
  }

  async getConnectionState() {
    return evolutionFetch(
      this.config,
      `/instance/connectionState/${encodeURIComponent(this.config.instanceName)}`,
      {
        method: "GET",
      },
    );
  }

  async getQRCode() {
    return evolutionFetch(
      this.config,
      `/instance/connect/${encodeURIComponent(this.config.instanceName)}`,
      {
        method: "GET",
      },
    );
  }

  async createInstance() {
    return evolutionFetch(this.config, "/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: this.config.instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });
  }

  async disconnect() {
    return evolutionFetch(
      this.config,
      `/instance/logout/${encodeURIComponent(this.config.instanceName)}`,
      {
        method: "DELETE",
      },
    );
  }

  async setWebhook(webhookUrl: string, secret: string) {
    return evolutionFetch(
      this.config,
      `/webhook/set/${encodeURIComponent(this.config.instanceName)}`,
      {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            url: webhookUrl,
            enabled: true,
            byEvents: false,
            base64: false,
            headers: { "x-webhook-secret": secret },
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
          },
        }),
      },
    );
  }
}
