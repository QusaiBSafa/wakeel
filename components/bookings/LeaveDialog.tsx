'use client';

import { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import type { MemberDTO } from '@/lib/types';

export type Leave = { id: string; memberId: string; from: string; to: string; note: string };

export default function LeaveDialog({ members, onClose, onSaved }: { members: MemberDTO[]; onClose: () => void; onSaved: (l: Leave) => void }) {
  const toast = useToast();
  const [memberId, setMemberId] = useState(members[0]?.id ?? '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const fromErr = touched && !from;
  const toErr = touched && (!to || (from && to < from));

  async function save() {
    if (!from || !to || to < from || !memberId) {
      setTouched(true);
      return;
    }
    setSaving(true);
    try {
      onSaved(await api<Leave>('POST', '/api/app/leaves', { memberId, from, to, note }));
      onClose();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      labelledBy="lv-h"
      body={
        <>
          <h2 id="lv-h">إضافة غياب</h2>
          <div className="field">
            <label htmlFor="lv-m">الموظف</label>
            <select id="lv-m" className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label htmlFor="lv-f">من</label>
              <input id="lv-f" className={fromErr ? 'input bad' : 'input'} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              {fromErr && <span className="err">اختر التاريخ</span>}
            </div>
            <div className="field">
              <label htmlFor="lv-t">إلى</label>
              <input id="lv-t" className={toErr ? 'input bad' : 'input'} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              {toErr && <span className="err">{to && from && to < from ? 'تاريخ النهاية يجب أن يكون بعد البداية' : 'اختر التاريخ'}</span>}
            </div>
          </div>
          <div className="field">
            <label htmlFor="lv-n">
              السبب <span className="opt">(اختياري)</span>
            </label>
            <input id="lv-n" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </>
      }
      foot={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            إلغاء
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving && <span className="spin" />}
            حفظ
          </button>
        </>
      }
    />
  );
}
