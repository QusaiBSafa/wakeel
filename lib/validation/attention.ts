import { z } from 'zod';
import { text } from './common';

// The text is sent (stubbed) and never stored or logged.
export const attentionReplySchema = z
  .object({
    mode: z.enum(['write', 'instruct']),
    text: text(1000).refine((v) => v.length > 0, { message: 'اكتب الرد قبل إرساله' }),
    resume: z.boolean(),
  })
  .strict();
