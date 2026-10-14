/* eslint-disable @next/next/no-img-element */
export default function Logo({ size = 26 }: { size?: number }) {
  return <img src="/logo.svg" alt="" width={size} height={Math.round((size * 323) / 247)} style={{ display: 'block' }} />;
}
