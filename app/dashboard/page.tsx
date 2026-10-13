'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/components/app/Store';
import { Icon } from '@/components/ui/icons';
import { readiness } from '@/lib/readiness';

type Item = { done: boolean; soon?: boolean; title: string; desc: string; cta: string; go: () => void };

export default function HomePage() {
  const { state, openWa } = useStore();
  const router = useRouter();
  const r = readiness(state);
  const bizName = state.business.name || 'شركتك';
  const go = (p: string) => () => router.push(p);

  const checklist: Item[] = [
    { done: r.infoDone >= 6, title: 'معلومات عامة', desc: `${r.infoDone} من 8 معلومات معبّاية`, cta: r.infoDone >= 6 ? 'عدّل' : 'كمّل', go: go('/dashboard/info') },
    {
      done: r.prodOk,
      title: 'المنتجات والخدمات',
      desc: r.prodOk ? `${state.products.length} منتج بالقائمة` : 'أضف أسعارك ليجاوب عنها هُدهُد',
      cta: r.prodOk ? 'عرض' : 'أضف',
      go: go('/dashboard/products'),
    },
    { done: r.bookOk, title: 'المواعيد', desc: r.bookOk ? `${r.weekSlots} موعد متاح بالأسبوع` : 'فعّل الحجز وحدد أوقاتك', cta: r.bookOk ? 'عدّل' : 'فعّل', go: go('/dashboard/booking') },
    { done: r.faqHandled >= Math.ceil(r.faqTotal * 0.6), title: 'الأسئلة الشائعة', desc: `جاوبت ${r.faqAnswered} من ${r.faqTotal}`, cta: 'جاوب', go: go('/dashboard/faq') },
    { done: false, soon: true, title: 'ربط واتساب', desc: 'آخر خطوة ليشتغل هُدهُد', cta: 'اربط', go: openWa },
  ];
  const next = checklist.find((c) => !c.done && !c.soon);
  const firstAnswered = state.faqs.find((f) => f.status === 'answered' && f.answer.trim());
  const ready = r.pct;

  return (
    <>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>أهلاً، {bizName}</h1>
        <p className="muted">{ready < 40 ? 'خلينا نجهّز هُدهُد خطوة خطوة.' : 'هاي آخر أخبار هُدهُد.'}</p>
      </div>

      <section className="card" aria-labelledby="ready-h" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: '#0B6E4B', lineHeight: 1 }}>{ready}%</span>
            <h2 id="ready-h" style={{ fontSize: 18, fontWeight: 800 }}>
              جاهزية هُدهُد
            </h2>
          </div>
          <div className="bar" role="progressbar" aria-label="جاهزية هُدهُد" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ready}>
            <span style={{ width: `${ready}%` }} />
          </div>
          <p className="muted">
            {ready < 40
              ? 'لسّا بدري. كل معلومة بتضيفها بتخلّي ردود هُدهُد أدق.'
              : ready < 80
                ? 'قرّبنا! كم خطوة كمان وهُدهُد بصير جاهز.'
                : 'هُدهُد جاهز تقريباً. ضل بس ربط واتساب.'}
          </p>
        </div>
        {next && (
          <div style={{ flex: '1 1 240px', background: '#F7F8F4', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="tag indigo" style={{ alignSelf: 'flex-start' }}>
              الخطوة الجاية
            </span>
            <div style={{ fontWeight: 800 }}>{next.title}</div>
            <p className="hint">{next.desc}</p>
            <button type="button" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={next.go}>
              {next.cta}
            </button>
          </div>
        )}
      </section>

      <div className="two">
        <section className="card" aria-labelledby="chk-h" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h2 id="chk-h" style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>
            خطوات التجهيز ({checklist.filter((c) => c.done).length} من 5)
          </h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
            {checklist.map((c) => (
              <li key={c.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #E6E9F0' }}>
                {c.done ? (
                  <span
                    role="img"
                    style={{ width: 28, height: 28, borderRadius: '50%', background: '#0B7F58', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}
                    aria-label="مكتمل"
                  >
                    <Icon name="check" size={16} style={{ strokeWidth: 3 }} />
                  </span>
                ) : (
                  <span role="img" style={{ width: 28, height: 28, borderRadius: '50%', border: '2px dashed #B9C1D0', flex: 'none' }} aria-label="غير مكتمل" />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{c.title}</div>
                  <div className="hint">{c.desc}</div>
                </div>
                {c.soon && <span className="tag amber">قريباً</span>}
                <button type="button" className="btn btn-ghost btn-sm" onClick={c.go} aria-label={`${c.cta}: ${c.title}`}>
                  {c.cta}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="pv-h" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 id="pv-h" style={{ fontSize: 19, fontWeight: 800 }}>
            هيك رح يرد هُدهُد
          </h2>
          <div style={{ borderRadius: 18, background: '#EEF2EC', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 180 }}>
            {firstAnswered ? (
              <>
                <div style={{ alignSelf: 'flex-start', background: '#fff', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', maxWidth: '85%' }}>{firstAnswered.question}</div>
                <div style={{ alignSelf: 'flex-end', background: '#DDF3E8', padding: '10px 14px', borderRadius: '16px 16px 4px 16px', maxWidth: '85%', whiteSpace: 'pre-wrap' }}>
                  {firstAnswered.answer}
                </div>
              </>
            ) : (
              <div style={{ margin: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <p className="muted">جاوب على أول سؤال شائع لتشوف كيف رح يرد هُدهُد على زباينك.</p>
                <Link href="/dashboard/faq" className="btn btn-soft btn-sm">
                  جاوب على سؤال
                </Link>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Stat n={state.products.length} label="منتج" />
            <Stat n={r.faqAnswered} label="جواب جاهز" />
            <Stat n={r.weekSlots} label="موعد متاح بالأسبوع" />
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ flex: '1 1 100px', background: '#F7F8F4', borderRadius: 14, padding: 12 }}>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{n}</div>
      <div className="hint">{label}</div>
    </div>
  );
}
