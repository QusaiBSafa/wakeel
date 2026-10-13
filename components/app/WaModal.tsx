'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Icon, WhatsAppTile } from '@/components/ui/icons';
import { useStore } from './Store';
import { api } from '@/lib/client/api';

export default function WaModal() {
  const { waOpen, closeWa, state, setState, showToast } = useStore();
  const [busy, setBusy] = useState(false);
  if (!waOpen) return null;

  const notify = async () => {
    setBusy(true);
    try {
      await api('POST', '/api/app/notify', { feature: 'whatsapp' });
      setState((s) => ({ ...s, notified: true }));
    } catch {
      showToast('ما قدرنا نسجّل طلبك، جرّب كمان مرة');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={closeWa} labelledBy="wa-h" narrow style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' }}>
      <WhatsAppTile size={72} />
      <span className="tag amber">قريباً</span>
      <h2 id="wa-h" style={{ fontSize: 22, fontWeight: 800 }}>
        ربط واتساب قريباً
      </h2>
      <p className="muted">عم نجهّز الربط مع واتساب بيزنس. بهالوقت كمّل معلوماتك، وأول ما يجهز بتربط رقمك بكبسة وحدة.</p>
      {state.notified ? (
        <div className="alert ok" role="status" style={{ width: '100%', textAlign: 'start' }}>
          <Icon name="check" />
          <div>تمام! رح نبعتلك إيميل أول ما يصير الربط متاح.</div>
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-block" onClick={notify} disabled={busy}>
          {busy ? <span className="spin" /> : <Icon name="bell" />}
          خبّرني لما يجهز
        </button>
      )}
      <button type="button" className="btn btn-ghost btn-block" onClick={closeWa} data-autofocus>
        تمام
      </button>
    </Modal>
  );
}
