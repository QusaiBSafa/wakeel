// «اكتمال المعلومات»: the seven checks of the business page.

export type CompletenessInput = {
  name: string;
  description: string;
  address: string;
  mapUrl: string;
  phone: string;
  returnsPolicy: string;
  cancelPolicy: string;
  deliveryEnabled: boolean;
  areaCount: number;
};

export function completeness(i: CompletenessInput): { done: number; total: number; missing: string[] } {
  const checks: [string, boolean][] = [
    ['الاسم', !!i.name.trim()],
    ['الوصف', !!i.description.trim()],
    ['العنوان', !!i.address.trim()],
    ['رابط الخريطة', !!i.mapUrl.trim()],
    ['رقم الهاتف', !!i.phone.trim()],
    ['سياسة الإرجاع أو الإلغاء', !!(i.returnsPolicy.trim() || i.cancelPolicy.trim())],
    ['مناطق التوصيل', !i.deliveryEnabled || i.areaCount > 0],
  ];
  return { done: checks.filter((c) => c[1]).length, total: checks.length, missing: checks.filter((c) => !c[1]).map((c) => c[0]) };
}
