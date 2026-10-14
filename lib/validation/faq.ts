import { z } from 'zod';
import { FAQ_CATEGORY_KEYS } from '../constants';
import { line, requiredLine, text } from './common';

const body = {
  question: requiredLine(200, 'اكتب السؤال'),
  answer: text(500).refine((v) => v.length > 0, { message: 'اكتب الجواب' }),
  category: z.enum(FAQ_CATEGORY_KEYS),
  enabled: z.boolean(),
  alts: z.array(requiredLine(200)).max(10),
  templateKey: z.string().max(40).nullable(),
};

export const faqCreateSchema = z.object(body).partial({ category: true, enabled: true, alts: true, templateKey: true }).strict();
export const faqPatchSchema = z.object(body).partial().strict();
export const dismissSuggestionSchema = z.object({ key: line(40).refine((v) => v.length > 0) }).strict();
