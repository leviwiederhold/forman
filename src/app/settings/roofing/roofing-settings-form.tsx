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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

function NumberInput(props: React.ComponentProps<typeof Input>) {
  return <Input inputMode="decimal" {...props} />;
}

export function RoofingSettingsForm({ initialRates }: { initialRates: RoofingRateCard }) {
  const [status, setStatus] = React.useState<null | "saving" | "saved" | "error">(null);

  const form = useForm<RoofingRateCard>({
    resolver: zodResolver(RoofingRateCardSchema),
    defaultValues: initialRates,
    mode: "onBlur",
  });

  async function onSubmit(values: RoofingRateCard) {
    setStatus("saving");

    const res = await fetch("/api/rate-cards/roofing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rates: values }),
    });

    if (!res.ok) {
      setStatus("error");
      return;
    }

    setStatus("saved");
    setTimeout(() => setStatus(null), 1500);
  }

  return (
    <div className="rounded-2xl border bg-card p-5 text-card-foreground">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <section className="space-y-3">
            <div className="text-sm text-foreground/80">Core rates</div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="labor_per_square"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Labor per square</FormLabel>
                    <FormControl>
                      <NumberInput type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
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
                    <FormLabel>Shingles per square</FormLabel>
                    <FormControl>
                      <NumberInput type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
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
                    <FormLabel>Underlayment per square</FormLabel>
                    <FormControl>
                      <NumberInput type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
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
                    <FormLabel>Tear-off / disposal per square</FormLabel>
                    <FormControl>
                      <NumberInput type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="text-sm text-foreground/80">Job rules</div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="minimum_job_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum job price</FormLabel>
                    <FormControl>
                      <NumberInput type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
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
                    <FormLabel>Markup percent</FormLabel>
                    <FormControl>
                      <NumberInput type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="text-sm text-foreground/80">Optional items</div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="ridge_vent_per_lf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ridge vent per LF</FormLabel>
                    <FormControl>
                      <NumberInput type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ridge_vent_default_selected"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border px-3 py-2">
                    <FormLabel className="m-0 text-sm">Default selected</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="drip_edge_per_lf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drip edge per LF</FormLabel>
                    <FormControl>
                      <NumberInput type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="drip_edge_default_selected"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border px-3 py-2">
                    <FormLabel className="m-0 text-sm">Default selected</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ice_water_per_square"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ice &amp; water per square</FormLabel>
                    <FormControl>
                      <NumberInput type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ice_water_default_selected"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border px-3 py-2">
                    <FormLabel className="m-0 text-sm">Default selected</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="steep_charge_flat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Steep charge (flat)</FormLabel>
                    <FormControl>
                      <NumberInput type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="steep_charge_default_selected"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border px-3 py-2">
                    <FormLabel className="m-0 text-sm">Default selected</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="permit_fee_flat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permit fee (flat)</FormLabel>
                    <FormControl>
                      <NumberInput type="number" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permit_fee_default_selected"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border px-3 py-2">
                    <FormLabel className="m-0 text-sm">Default selected</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </section>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-foreground/60">
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved." : status === "error" ? "Save failed." : " "}
            </div>

            <Button type="submit" disabled={status === "saving"}>
              Save rate card
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
