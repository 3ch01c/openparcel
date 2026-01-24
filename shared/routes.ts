import { z } from 'zod';
import { insertPropertySchema, properties } from './schema';

export const api = {
  properties: {
    list: {
      method: 'GET' as const,
      path: '/api/properties',
      input: z.object({
        minValue: z.coerce.number().optional(),
        maxValue: z.coerce.number().optional(),
        year: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof properties.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/properties/:id',
      responses: {
        200: z.custom<typeof properties.$inferSelect>(),
        404: z.object({ message: z.string() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
