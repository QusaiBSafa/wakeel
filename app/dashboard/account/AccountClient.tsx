'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AccountPlan from '@/components/account/AccountPlan';
import AccountSections from '@/components/account/AccountSections';
import AccountTeam from '@/components/account/AccountTeam';
import AccountWhatsApp from '@/components/account/AccountWhatsApp';
import Tabs from '@/components/ui/Tabs';
import type { AccountData } from '@/lib/server/loaders/account';

export type AccountTab = 'wa' | 'team' | 'plan' | 'sections';

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
          <p>ربط واتساب، وفريق العمل، والاشتراك، والأقسام الظاهرة في لوحة التحكم.</p>
        </div>
      </div>
      <Tabs
        label="أقسام الإعدادات"
        value={tab}
        onChange={go}
        tabs={[
          { value: 'wa', label: 'واتساب', dot: waState !== 'on' },
          { value: 'team', label: 'فريق العمل' },
          { value: 'plan', label: 'الاشتراك' },
          { value: 'sections', label: 'أقسام اللوحة' },
        ]}
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
