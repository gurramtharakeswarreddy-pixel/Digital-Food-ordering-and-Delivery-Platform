import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
 NODE_ENV:z.string().default('development'), PORT:z.coerce.number().default(3000),
 FRONTEND_ORIGIN:z.string().url(), APP_BASE_URL:z.string().url(),
 SUPABASE_URL:z.string().url(), SUPABASE_ANON_KEY:z.string().min(1),
 SUPABASE_SERVICE_ROLE_KEY:z.string().min(1),
 RAZORPAY_KEY_ID:z.string().optional(), RAZORPAY_KEY_SECRET:z.string().optional(),
 RAZORPAY_WEBHOOK_SECRET:z.string().optional(), EMAIL_PROVIDER_API_KEY:z.string().optional(),
 EMAIL_FROM:z.string().optional()
});
const parsed=schema.safeParse(process.env);
if(!parsed.success){ console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors); process.exit(1); }
export const env=parsed.data;
