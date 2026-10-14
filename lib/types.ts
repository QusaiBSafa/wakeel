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

import type { BookingStatus, BusinessType, CancelReason, FaqCategory, OrderStatus, Offers, TeamRole } from './constants';

export type Sections = { orders: boolean; bookings: boolean; products: boolean; services: boolean; delivery: boolean };
export type WaState = 'on' | 'off' | 'warn';
export type Actor = 'ai' | 'owner' | 'customer' | 'system';

export type ShellData = {
  business: {
    id: string;
    name: string;
    initial: string;
    color: number;
    type: BusinessType;
    offers: Offers;
    sections: Sections;
    onboardingDone: boolean;
    onboardingProgress: { done: number; total: number };
  };
  owner: { name: string };
  wa: WaState;
  counts: { attention: number; newOrders: number };
  aiEnabled: boolean;
  staging: boolean;
};

export type MemberDTO = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: TeamRole;
  status: 'active' | 'pending';
  color: number;
  providesServices: boolean;
};

export type HoursDTO = { weekday: number; open: boolean; openMin: number; closeMin: number; breakStartMin: number | null; breakEndMin: number | null };

export type CatalogItemDTO = {
  id: string;
  kind: 'product' | 'service';
  name: string;
  description: string;
  priceMinor: number;
  variants: { name: string; priceMinor: number }[];
  stockMode: 'always' | 'qty' | 'out';
  stockQty: number | null;
  active: boolean;
  durationMin: number | null;
  bufferMin: number;
  days: number[];
  imageUrl: string | null;
  position: number;
  staffIds: string[];
};

export type DeliveryAreaDTO = { id: string; name: string; feeMinor: number; eta: string };

export type OrderItemDTO = { id: string; itemId: string | null; name: string; unitPriceMinor: number; qty: number };
export type OrderEventDTO = { id: string; kind: string; text: string; actorName: string; createdAt: string };
export type OrderDTO = {
  id: string;
  number: number;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  isDraft: boolean;
  source: Actor;
  pickup: boolean;
  areaId: string | null;
  areaName: string;
  address: string;
  notes: string;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
  cancelReason: CancelReason | null;
  createdAt: string;
  deliveredAt: string | null;
  items: OrderItemDTO[];
  events: OrderEventDTO[];
};

export type BookingDTO = {
  id: string;
  number: number;
  customerName: string;
  customerPhone: string;
  itemId: string | null;
  serviceName: string;
  priceMinor: number;
  durationMin: number;
  bufferMin: number;
  memberId: string | null;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  source: Actor;
};

/** No message text and no reply text: only the reason, the phone and an optional suggestion. */
export type AttentionDTO = {
  id: string;
  customerName: string;
  customerPhone: string;
  reason: string;
  refKind: 'order' | 'booking' | null;
  refId: string | null;
  refLabel: string | null;
  suggestion: string | null;
  status: 'open' | 'replied';
  hodhodPaused: boolean;
  createdAt: string;
};

export type FaqDTO = {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
  enabled: boolean;
  alts: string[];
  usageCount: number;
  templateKey: string | null;
  updatedAt: string;
};

export type DailyStatsDTO = {
  conversations: number;
  autoReplied: number;
  ordersLogged: number;
  bookingsConfirmed: number;
  handedOff: number;
  resolved: number;
  messages: number;
  replyMsTotal: number;
  replies: number;
};

export type WhatsAppDTO = {
  status: 'connected' | 'needs_attention' | 'disconnected';
  phone: string;
  displayName: string;
  connectedAt: string | null;
  tokenExpiresAt: string | null;
  disconnectedAt: string | null;
  quality: string;
  lastReplyAt: string | null;
  isStub: boolean;
};

export type BusinessInfoDTO = {
  id: string;
  name: string;
  type: BusinessType;
  description: string;
  city: string;
  address: string;
  landmark: string;
  mapUrl: string;
  parking: string;
  phone: string;
  instagram: string;
  facebook: string;
  website: string;
  returnsPolicy: string;
  cancelPolicy: string;
  rules: string[];
  deliveryEnabled: boolean;
  freeOverMinor: number | null;
  offers: Offers;
  sections: Sections;
  afterHours: 'reply' | 'away';
  sectionUpdated: Partial<Record<'basic' | 'location' | 'contact' | 'policy' | 'delivery' | 'hours', string>>;
  onboardedAt: string | null;
  createdAt: string;
};
