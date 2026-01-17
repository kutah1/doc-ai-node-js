import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().min(1, { message: "API key name cannot be empty" }).max(255),
});
