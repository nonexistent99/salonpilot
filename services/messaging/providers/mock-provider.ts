export class MockMessagingProvider {
  async sendText(args: { to: string; text: string }) {
    return {
      key: { id: `mock_${Date.now()}` },
      message: { conversation: args.text },
      to: args.to,
    };
  }

  async sendImage(args: { to: string; imageUrl: string; caption?: string }) {
    return {
      key: { id: `mock_image_${Date.now()}` },
      to: args.to,
      imageUrl: args.imageUrl,
      caption: args.caption,
    };
  }
}
