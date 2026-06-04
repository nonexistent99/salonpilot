export async function sendWhatsAppMessage() {
  throw new Error('Zaia integration was removed. Use Evolution transport through services/messaging.');
}

export function zaiaStatus() {
  return {
    configured: false,
    removed: true,
    replacement: 'Evolution API transport + OpenAI agent + SalonPilot database',
  };
}
