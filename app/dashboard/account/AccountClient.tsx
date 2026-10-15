'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AccountPlan from '@/components/account/AccountPlan';
import AccountSections from '@/components/account/AccountSections';
import AccountTeam from '@/components/account/AccountTeam';
import AccountWhatsApp from '@/components/account/AccountWhatsApp';
import Tabs from '@/components/ui/Tabs';
import type { AccountData } from '@/lib/server/loaders/account';
import { type AccountTab, VISIBLE_ACCOUNT_TABS } from './tabs';

export type { AccountTab };

export default function AccountClient({ data, initialTab }: { data: AccountData; initialTab: AccountTab }) {
  const router = useRouter();
  const [tab, setTab] = useState<AccountTab>(initialTab);
  const waState = !data.wa || data.wa.status === 'disconnected' ? 'off' : data.wa.status === 'needs_attention' ? 'warn' : 'on';
  const go = (t: AccountTab) => {
    setTab(t);
    window.history.replaceState(null, '', t === 'wa' ? '/dashboard/account' : `/dashboard/account?tab=${t}`);
  };
  const refresh = () => router.refresh();
  return (
    <main className="page" id="main" style={{ maxWidth: 1000 }}>
      <div className="page-head">
        <div className="t">
          <h1>إعدادات الحساب</h1>
          <p>ربط واتساب، والأقسام الظاهرة في لوحة التحكم.</p>
        </div>
      </div>
      <Tabs
        label="أقسام الإعدادات"
        value={tab}
        onChange={go}
        tabs={[
          { value: 'wa' as const, label: 'واتساب', dot: waState !== 'on' },
          { value: 'team' as const, label: 'فريق العمل' },
          { value: 'plan' as const, label: 'الاشتراك' },
          { value: 'sections' as const, label: 'أقسام اللوحة' },
        ].filter((t) => VISIBLE_ACCOUNT_TABS.includes(t.value))}
      />
      <div style={{ marginTop: 20 }}>
        {tab === 'wa' && <AccountWhatsApp data={data} state={waState} onChanged={refresh} />}
        {tab === 'team' && <AccountTeam data={data} onChanged={refresh} />}
        {tab === 'plan' && <AccountPlan data={data} />}
        {tab === 'sections' && <AccountSections data={data} onChanged={refresh} />}
      </div>
    </main>
  );
}
