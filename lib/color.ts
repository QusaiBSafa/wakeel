/** Stable colour index 0..7 (the `.av c0`…`.av c7` classes) from any string. */
export function colorOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 8;
}
