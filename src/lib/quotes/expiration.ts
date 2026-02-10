export const QUOTE_EXPIRING_SOON_HOURS = 72;
export const QUOTE_DEFAULT_EXPIRATION_DAYS = 14;

export type QuoteExpirationStatus = {
  expiresAt: Date | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  msRemaining: number | null;
};

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getQuoteExpirationStatus(
  expiresAtIso: string | null | undefined,
  now = new Date()
): QuoteExpirationStatus {
  const expiresAt = parseDate(expiresAtIso);
  if (!expiresAt) {
    return {
      expiresAt: null,
      isExpired: false,
      isExpiringSoon: false,
      msRemaining: null,
    };
  }

  const msRemaining = expiresAt.getTime() - now.getTime();
  const isExpired = msRemaining <= 0;
  const isExpiringSoon = !isExpired && msRemaining <= QUOTE_EXPIRING_SOON_HOURS * 60 * 60 * 1000;

  return {
    expiresAt,
    isExpired,
    isExpiringSoon,
    msRemaining,
  };
}

export function formatExpiresIn(msRemaining: number | null) {
  if (msRemaining === null) return null;
  if (msRemaining <= 0) return "Expired";

  const hours = Math.ceil(msRemaining / (60 * 60 * 1000));
  if (hours >= 48) {
    const days = Math.ceil(hours / 24);
    return `Expires in ${days} day${days === 1 ? "" : "s"}`;
  }

  return `Expires in ${hours} hour${hours === 1 ? "" : "s"}`;
}

