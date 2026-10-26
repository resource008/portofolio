import { z } from "zod";

export const idSchema = z.coerce.number().int().positive();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
});

export const reorderSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
});
