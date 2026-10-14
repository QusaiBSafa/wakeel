'use client';

import { useState } from 'react';
import AvailabilitySettings from '@/components/bookings/AvailabilitySettings';
import EmptyState from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import Tabs from '@/components/ui/Tabs';
import type { BookingsData } from '@/lib/server/loaders/bookings';

type Tab = 'cal' | 'set';

export default function BookingsClient({ data, initialTab }: { data: BookingsData; initialTab: Tab; initialId: string | null }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  return (
    <main className="page" id="main" data-clarity-mask="true">
      <div className="page-head">
        <div className="t">
          <h1>الحجوزات</h1>
          <p>مواعيد اليوم والأسبوع، وأوقات العمل التي يحجز فيها هُدهُد.</p>
        </div>
        <button type="button" className="btn btn-primary">
          <Icon name="plus" />
          حجز جديد
        </button>
      </div>
      <Tabs
        label="أقسام الحجوزات"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'cal', label: 'التقويم' },
          { value: 'set', label: 'أوقات العمل والتوفّر' },
        ]}
      />
      {tab === 'cal' ? <EmptyState icon="calendar" tone="accent" title="قيد التجهيز" /> : <AvailabilitySettings data={data} />}
    </main>
  );
}
