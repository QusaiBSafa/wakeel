'use client';
// Local-only stand-in for @clerk/nextjs (see server.ts).
import { useEffect, useState } from 'react';

if (process.env.VERCEL) throw new Error('clerk mock must never run on Vercel');

function readUser() {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|; )e2e_user=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setLoaded] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserId(readUser());
    setLoaded(true);
  }, []);
  return { userId, isLoaded, isSignedIn: !!userId };
}

export function useUser() {
  const { userId, isLoaded } = useAuth();
  const unverified = typeof document !== 'undefined' && document.cookie.includes('e2e_unverified=1');
  return {
    isLoaded,
    user: userId
      ? {
          id: userId,
          firstName: 'سامي',
          lastName: 'ناصر',
          fullName: 'سامي ناصر',
          primaryEmailAddress: { emailAddress: 'owner@example.com', verification: { status: unverified ? 'unverified' : 'verified' } },
        }
      : null,
  };
}

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function UserButton() {
  return (
    <button type="button" aria-label="حسابي" style={{ width: 40, height: 40, borderRadius: '50%', border: 0, background: '#4B5BD6', color: '#fff', fontWeight: 800 }}>
      س
    </button>
  );
}

function MockForm({ title }: { title: string }) {
  return (
    <form
      data-testid="mock-auth"
      onSubmit={(e) => {
        e.preventDefault();
        const id = (new FormData(e.currentTarget).get('uid') as string) || 'user_e2eA';
        document.cookie = `e2e_user=${encodeURIComponent(id)}; path=/`;
        window.location.assign(new URL('/onboarding', window.location.origin));
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <p className="hint">[local mock of Clerk {title}]</p>
      <input name="uid" className="input" defaultValue="user_e2eA" dir="ltr" aria-label="user id" />
      <button className="btn btn-primary" type="submit">
        {title}
      </button>
    </form>
  );
}

export const SignIn = () => <MockForm title="SignIn" />;
export const SignUp = () => <MockForm title="SignUp" />;
export const UserProfile = () => <div className="card">[local mock of Clerk UserProfile]</div>;
