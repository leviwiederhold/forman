export function isTrialActive(trialStartedAt: string | null) {
  if (!trialStartedAt) return true; // grace: treat missing as active
  const start = new Date(trialStartedAt).getTime();
  const now = Date.now();
  const days = (now - start) / (1000 * 60 * 60 * 24);
  return days <= 7;
}
