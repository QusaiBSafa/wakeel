// DTO types shared by server loaders and client components. Dates are ISO strings.
// There is deliberately no pay-method, conversation or message-content field anywhere in here.

export type AiConfig = {
  mode: 'auto' | 'approve';
  lang: 'match' | 'fusha' | 'dialect';
  tone: 'friendly' | 'formal' | 'short';
  name: string;
  emoji: boolean;
  perms: { orders: boolean; bookings: boolean; resched: boolean; prices: boolean; alt: boolean; discount: boolean };
  rules: { human: boolean; complaint: boolean; unknown: boolean; discount: boolean; big: boolean; group: boolean };
  bigMinor: number;
  groupNum: number;
  notify: { dash: boolean; wa: boolean; email: boolean };
  unk: 'handoff' | 'call' | 'custom';
  unkMsg: string;
};
