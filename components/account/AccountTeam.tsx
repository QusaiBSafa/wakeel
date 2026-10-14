'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Dialog from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import { PHONE_RE } from '@/lib/format';
import { MAX_TEAM_MEMBERS } from '@/lib/constants';
import type { AccountData } from '@/lib/server/loaders/account';
import type { MemberDTO } from '@/lib/types';

type Role = 'admin' | 'staff' | 'book';
const ROLES: [Role, string][] = [
  ['admin', 'مدير: كل الصلاحيات'],
  ['staff', 'موظف: الطلبات والحجوزات'],
  ['book', 'الحجوزات فقط'],
];

export default function AccountTeam({ data, onChanged }: { data: AccountData; onChanged: () => void }) {
  const toast = useToast();
  const [rm, setRm] = useState<MemberDTO | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const nameErr = touched && !name.trim();
  const phoneErr = touched && !PHONE_RE.test(phone.trim());

  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });

  async function setMemberRole(m: MemberDTO, r: Role) {
    try {
      await api('PATCH', `/api/app/team/${m.id}`, { role: r });
      toast(`تم تغيير صلاحية ${m.name}`);
      onChanged();
    } catch (e) {
      fail(e);
      onChanged();
    }
  }

  async function remove() {
    if (!rm) return;
    setBusy(true);
    try {
      await api('DELETE', `/api/app/team/${rm.id}`);
      toast(`أُزيل ${rm.name} من الفريق`);
      onChanged();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
      setRm(null);
    }
  }

  async function invite() {
    if (!name.trim() || !PHONE_RE.test(phone.trim())) {
      setTouched(true);
      return;
    }
    if (data.members.length >= MAX_TEAM_MEMBERS) {
      toast('وصلت إلى الحد الأقصى لأعضاء الفريق في باقتك', { kind: 'bad' });
      return;
    }
    setBusy(true);
    try {
      await api('POST', '/api/app/team', { name: name.trim(), phone: phone.trim(), role });
      toast('أُرسلت الدعوة عبر واتساب');
      setName('');
      setPhone('');
      setTouched(false);
      onChanged();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col" style={{ gap: 20 }} data-clarity-mask="True">
      <section className="card" aria-labelledby="tm-h">
        <div className="card-head">
          <div>
            <h2 id="tm-h">فريق العمل</h2>
            <span className="subtle">
              {data.members.length} أعضاء من أصل {MAX_TEAM_MEMBERS} في باقتك
            </span>
          </div>
        </div>
        <ul>
          {data.members.map((m) => {
            const owner = m.role === 'owner';
            return (
              <li key={m.id} className="row" style={{ gap: 12, padding: '14px 20px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <Avatar name={m.name} color={m.color} />
                <div className="col grow" style={{ gap: 2, minWidth: 160 }}>
                  <b>
                    {m.name}
                    {m.status === 'pending' && (
                      <>
                        {' '}
                        <span className="bdg warning">دعوة معلّقة</span>
                      </>
                    )}
                  </b>
                  <span className="subtle ltr" style={{ textAlign: 'right' }}>
                    {[m.phone, owner ? m.email : ''].filter(Boolean).join(' · ')}
                  </span>
                </div>
                {owner ? (
                  <span className="bdg brand">المالك</span>
                ) : (
                  <>
                    <label className="sr-only" htmlFor={`role-${m.id}`}>
                      صلاحية {m.name}
                    </label>
                    <select id={`role-${m.id}`} className="input" value={m.role} onChange={(e) => setMemberRole(m, e.target.value as Role)} style={{ width: 'auto', minWidth: 150 }}>
                      {ROLES.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="ib sm danger" onClick={() => setRm(m)} aria-label={`إزالة ${m.name}`}>
                      <Icon name="trash" size="sm" />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card" aria-labelledby="iv-h">
        <div className="card-head">
          <div>
            <h2 id="iv-h">دعوة عضو جديد</h2>
            <span className="subtle">تصله رسالة واتساب برابط الدخول</span>
          </div>
        </div>
        <div className="card-body">
          <div className="grid-3" style={{ gap: 12, alignItems: 'start' }}>
            <div className="field">
              <label htmlFor="iv-n">
                الاسم <span className="req" aria-hidden="true">*</span>
              </label>
              <input id="iv-n" className={nameErr ? 'input bad' : 'input'} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: نور حمدان" />
              {nameErr && <span className="err">اكتب الاسم</span>}
            </div>
            <div className="field">
              <label htmlFor="iv-p">
                رقم واتساب <span className="req" aria-hidden="true">*</span>
              </label>
              <input id="iv-p" className={phoneErr ? 'input bad' : 'input'} type="tel" inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+970 59 123 4567" />
              {phoneErr && <span className="err">اكتب رقماً صحيحاً، مثل ‎+970 59 123 4567</span>}
            </div>
            <div className="field">
              <label htmlFor="iv-r">الصلاحية</label>
              <select id="iv-r" className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {ROLES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="card-foot">
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={invite}>
            {busy && <span className="spin" />}
            أرسل الدعوة
          </button>
        </div>
      </section>

      <Dialog
        open={!!rm}
        onClose={() => setRm(null)}
        labelledBy="rm-h"
        role="alertdialog"
        body={
          <div className="col" style={{ gap: 12 }}>
            <h2 id="rm-h">إزالة {rm?.name} من الفريق؟</h2>
            <p className="muted">لن يتمكن من الدخول إلى لوحة التحكم بعد الآن. تبقى الحجوزات المسندة إليه كما هي.</p>
          </div>
        }
        foot={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setRm(null)}>
              إلغاء
            </button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={remove}>
              {busy && <span className="spin" />}
              أزِل
            </button>
          </>
        }
      />
    </div>
  );
}
