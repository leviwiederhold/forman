"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  RoofingRateCardSchema,
  type RoofingRateCard,
} from "@/trades/roofing/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

function MoneyInput({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full max-w-[240px]">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
        $
      </span>
      <Input
        inputMode="decimal"
        type="number"
        step="0.01"
        className="pl-7"
        value={Number.isFinite(value) ? value : 0}
        placeholder={placeholder}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function PercentInput({
  value,
  onChange,
  placeholder,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="relative w-full max-w-[240px]">
      <Input
        inputMode="decimal"
        type="number"
        step="0.01"
        min={min}
        max={max}
        className="pr-10"
        value={Number.isFinite(value) ? value : 0}
        placeholder={placeholder}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
        %
      </span>
    </div>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm text-foreground/85">{label}</div>
        {hint ? (
          <div className="mt-0.5 text-xs text-foreground/55">{hint}</div>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function RoofingSettingsForm({
  initialRates,
}: {
  initialRates: RoofingRateCard;
}) {
  const [rateStatus, setRateStatus] = React.useState<
    null | "saving" | "saved" | "error"
  >(null);

  // Deposit settings state (separate from rate card form)
  const [depositPercent, setDepositPercent] = React.useState<number>(25);
  const [acceptDepositsOnShare, setAcceptDepositsOnShare] = React.useState<boolean>(false);
  const [depositStatus, setDepositStatus] = React.useState<
    null | "loading" | "saving" | "saved" | "error"
  >(null);

  const form = useForm<RoofingRateCard>({
    resolver: zodResolver(RoofingRateCardSchema),
    defaultValues: initialRates,
    mode: "onBlur",
  });

  // Load current deposit percent from server
  React.useEffect(() => {
    let alive = true;

    async function loadDeposit() {
      setDepositStatus("loading");
      try {
        const res = await fetch("/api/profile/deposit-settings", {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          depositPercent?: number | null;
          acceptDepositsOnShare?: boolean | null;
        };

        if (!alive) return;

        const v = Number(json.depositPercent);
        if (Number.isFinite(v) && v >= 0 && v <= 100) {
          setDepositPercent(v);
        } else {
          setDepositPercent(25);
        }

        setAcceptDepositsOnShare(Boolean(json.acceptDepositsOnShare));

        setDepositStatus(null);
      } catch {
        if (!alive) return;
        setDepositStatus("error");
      }
    }

    loadDeposit();
    return () => {
      alive = false;
    };
  }, []);

  async function saveDeposit() {
  setDepositStatus("saving");
  try {
    const res = await fetch("/api/profile/deposit-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depositPercent, acceptDepositsOnShare }),
    });

    if (!res.ok) {
      // IMPORTANT: read text first so we see real server errors (not just {})
      const text = await res.text().catch(() => "");
      console.error("Deposit save failed", res.status, text.slice(0, 500));
      setDepositStatus("error");
      return;
    }

    setDepositStatus("saved");
  } catch (e) {
    console.error("Deposit save error", e);
    setDepositStatus("error");
  }
}


  async function onSubmit(values: RoofingRateCard) {
    setRateStatus("saving");
    try {
      const res = await fetch("/api/rate-cards/roofing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rates: values }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.log(j);
        setRateStatus("error");
        return;
      }

      setRateStatus("saved");
      setTimeout(() => setRateStatus(null), 1500);
    } catch {
      setRateStatus("error");
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 text-card-foreground">
      <div className="mb-4 space-y-1">
        <div className="text-sm text-foreground/85">Roofing pricing</div>
        <div className="text-xs text-foreground/60">
          Configure deposits + your default rate card. Quotes use your latest saved
          values.
        </div>
      </div>

      {/* Deposits */}
      <section className="space-y-3">
        <div className="text-xs uppercase tracking-wider text-foreground/60">
          Deposits
        </div>

        <FieldRow
          label="Deposit percent"
          hint="Customers can pay a deposit after approving a quote (Stripe)."
        >
          <PercentInput
            value={depositPercent}
            onChange={setDepositPercent}
            min={0}
            max={100}
          />
        </FieldRow>

        <FieldRow
          label="Accept deposits on share links"
          hint="If on, prospects can pay the deposit right from the shared quote link."
        >
          <div className="flex items-center gap-2">
            <Checkbox
              checked={acceptDepositsOnShare}
              onCheckedChange={(v) => setAcceptDepositsOnShare(Boolean(v))}
              aria-label="Accept deposits on share links"
            />
            <span className="text-xs text-foreground/70">Enable</span>
          </div>
        </FieldRow>

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-foreground/60">
            {depositStatus === "loading"
              ? "Loading…"
              : depositStatus === "saving"
              ? "Saving…"
              : depositStatus === "saved"
              ? "Saved."
              : depositStatus === "error"
              ? "Save failed."
              : " "}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={saveDeposit}
            disabled={depositStatus === "saving" || depositStatus === "loading"}
          >
            Save deposit settings
          </Button>
        </div>
      </section>

      <Separator className="my-6" />

      {/* Rate Card */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* BASE COSTS */}
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-foreground/60">
              Base roof costs (per square)
            </div>

            <FormField
              control={form.control}
              name="labor_per_square"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FieldRow label="Labor" hint="Charged on every quote (per square)">
                      <MoneyInput value={Number(field.value)} onChange={field.onChange} />
                    </FieldRow>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shingles_per_square"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FieldRow label="Shingles" hint="Charged on every quote (per square)">
                      <MoneyInput value={Number(field.value)} onChange={field.onChange} />
                    </FieldRow>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="underlayment_per_square"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FieldRow label="Underlayment" hint="Charged on every quote (per square)">
                      <MoneyInput value={Number(field.value)} onChange={field.onChange} />
                    </FieldRow>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tearoff_disposal_per_square"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FieldRow label="Tear-off & disposal" hint="Used when Tear-off is on (per square)">
                      <MoneyInput value={Number(field.value)} onChange={field.onChange} />
                    </FieldRow>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <Separator />

          {/* ADD-ONS */}
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-foreground/60">
              Common add-ons (only if selected on a quote)
            </div>

            <FormField
              control={form.control}
              name="ridge_vent_per_lf"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FieldRow label="Ridge vent" hint="Per linear foot (LF)">
                      <MoneyInput value={Number(field.value)} onChange={field.onChange} />
                    </FieldRow>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="drip_edge_per_lf"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FieldRow label="Drip edge" hint="Per linear foot (LF)">
                      <MoneyInput value={Number(field.value)} onChange={field.onChange} />
                    </FieldRow>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ice_water_per_square"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FieldRow label="Ice & water shield" hint="Per square">
                      <MoneyInput value={Number(field.value)} onChange={field.onChange} />
                    </FieldRow>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <Separator />

          {/* ONE-TIME FEES */}
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-foreground/60">
              One-time fees (only if selected on a quote)
            </div>

            <FormField
              control={form.control}
              name="steep_charge_flat"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FieldRow label="Steep roof charge" hint="Flat fee (one time)">
                      <MoneyInput value={Number(field.value)} onChange={field.onChange} />
                    </FieldRow>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permit_fee_flat"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FieldRow label="Permit fee" hint="Flat fee (one time)">
                      <MoneyInput value={Number(field.value)} onChange={field.onChange} />
                    </FieldRow>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <Separator />

          {/* RULES */}
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-foreground/60">
              Rules
            </div>

            <FormField
              control={form.control}
              name="minimum_job_price"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FieldRow
                      label="Minimum job price"
                      hint="If calculated total is lower, it will be raised to this minimum."
                    >
                      <MoneyInput value={Number(field.value)} onChange={field.onChange} />
                    </FieldRow>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="markup_percent"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FieldRow label="Markup" hint="Markup applied to subtotal">
                      <PercentInput value={Number(field.value)} onChange={field.onChange} />
                    </FieldRow>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-foreground/60">
              {rateStatus === "saving"
                ? "Saving…"
                : rateStatus === "saved"
                ? "Saved."
                : rateStatus === "error"
                ? "Save failed."
                : " "}
            </div>

            <Button type="submit" disabled={rateStatus === "saving"}>
              Save rate card
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}