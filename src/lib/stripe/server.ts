// src/lib/stripe/server.ts
export const runtime = "nodejs";

import Stripe from "stripe";

/**
 * Force required env vars at runtime
 */
export function mustEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/**
 * Stripe server client
 * NOTE:
 * - This must only be used in server / API routes
 * - Do NOT import this into client components
 */
export const stripe = new Stripe(mustEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-12-15.clover",
});