/** Bookable staff = members who provide services; with nobody else, the owner is the single bookable member. */
export function bookableMembers<T extends { role: string; providesServices: boolean }>(members: T[]): T[] {
  const staff = members.filter((m) => m.providesServices);
  if (staff.length) return staff;
  const owner = members.find((m) => m.role === 'owner');
  return owner ? [owner] : [];
}
