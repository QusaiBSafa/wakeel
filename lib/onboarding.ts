// Pure onboarding helpers: step list and "done" logic (port of the prototype's stepDone).

export type StepCtx = {
  maxStep: number;
  skipped: number[];
  waConnected: boolean;
  /** the business offers delivery (step 5 applies) */
  delivery: boolean;
  /** Hudhud has been activated (the wizard is finished) */
  activated: boolean;
};

export const STEP_COUNT = 8;

export function stepDone(i: number, c: StepCtx): boolean {
  if (c.activated) return true;
  if (c.skipped.includes(i)) return false;
  if (i === 7) return c.waConnected;
  if (i === 8) return false;
  return c.maxStep > i;
}

/** Number of finished steps out of 8 (step 5 counts once the user is past it when delivery is not offered). */
export function doneCount(c: StepCtx): number {
  let n = 0;
  for (let i = 1; i <= STEP_COUNT; i++) if (stepDone(i, c) || (i === 5 && !c.delivery && c.maxStep > 5)) n++;
  return n;
}
