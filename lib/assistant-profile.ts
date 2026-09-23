import { z } from 'zod';
import { sqlOne } from '@/lib/db/neon';

export const assistantProfileSchema = z.object({
  tone: z.string().trim().min(3).max(240),
  audience: z.string().trim().min(3).max(500),
  differentiators: z.string().trim().min(3).max(800),
  policies: z.string().trim().min(10).max(1600),
  faq: z.string().trim().max(1600).default(''),
  instagramVoice: z.string().trim().min(3).max(600),
  approval: z.literal(true),
  enabled: z.boolean().default(false),
});
export type AssistantProfile = z.infer<typeof assistantProfileSchema>;

export async function getAssistantProfile(salonId: string): Promise<AssistantProfile | null> {
  const row = await sqlOne<{ value_json: unknown }>(
    `SELECT value_json FROM salon_settings WHERE salon_id = $1 AND key = 'assistant_profile'`, [salonId]);
  const result = assistantProfileSchema.safeParse(row?.value_json);
  return result.success ? result.data : null;
}
