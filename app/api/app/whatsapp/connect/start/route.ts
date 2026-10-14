import { handler, json, requireBusiness } from '@/lib/server/api';

/** STUB: pretends to sign in to Meta and lists two numbers. Nothing is contacted. */
export const POST = handler(async () => {
  const { business } = await requireBusiness();
  return json({
    numbers: [
      { phone: business.phone || '+970 59 812 3344', desc: `${business.name || 'نشاطك'} · واتساب للأعمال` },
      { phone: '+970 56 700 2190', desc: 'رقم جديد · لم يُستخدم في واتساب' },
    ],
  });
});
