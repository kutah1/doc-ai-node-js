import { z } from 'zod';

export const usageMetricSchema = z.object({
  user_id: z.string().uuid().optional(), // Can be null if API key is used directly
  api_key_id: z.string().uuid().optional(), // Can be null if user_id is used directly
  prompt_tokens: z.number().int().min(0),
  completion_tokens: z.number().int().min(0),
  total_tokens: z.number().int().min(0),
  model_name: z.string().min(1, { message: "Model name cannot be empty" }),
});
