"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  RoofingNewQuoteSchema,
  type RoofingNewQuote,
  type OneTimeCustomItem,
  type RoofingRateCard,
} from "@/trades/roofing/schema";

import { calculateRoofingQuote, type SavedCustomItem } from "@/trades/roofing/pricing";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

function toSquares(value: number, unit: "squares" | "sqft") {
  return unit === "squares" ? value : value / 100;
}

function safeMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function NumInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <Input
      type="number"
      step="0.01"
      inputMode="decimal"
      className="max-w-[180px]"
      value={typeof value === "number" && Number.isFinite(value) ? value : ""}
      placeholder={placeholder}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function NewQuoteClient({
  rates,
  customItems,
  editId,
  initialPayload,
}: {
  rates: RoofingRateCard;
  customItems: SavedCustomItem[];
  editId?: string;
  initialPayload?: RoofingNewQuote;
}) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);

  const resolver =
    zodResolver(RoofingNewQuoteSchema) as unknown as Resolver<RoofingNewQuote>;

  const form = useForm<RoofingNewQuote>({
    resolver,
    mode: "onChange",
    defaultValues:
      initialPayload ??
      ({
        inputs: {
          customer_name: "",
          customer_address: "",
          roof_size_value: 24,
          roof_size_unit: "squares",
          pitch: "7/12",
          stories: 2,
          tearoff: true,
          layers: 1,
        },
        selections: {
          ridge_vent_selected: false,
          ridge_vent_lf: undefined,

          drip_edge_selected: false,
          drip_edge_lf: undefined,

          ice_water_selected: false,
          ice_water_squares: undefined,

          steep_charge_selected: false,
          permit_fee_selected: false,

          tearoff_selected: true,

          selected_saved_custom_item_ids: [],
          one_time_custom_items: [],
        },
      } as RoofingNewQuote),
  });

  const inputs = form.watch("inputs");
  const selections = form.watch("selections");

  const pricing = React.useMemo(() => {
    return calculateRoofingQuote({
      args: { inputs, selections },
      rateCard: rates,
      savedCustomItems: customItems,
    });
  }, [inputs, selections, rates, customItems]);

  // keep layers + tearoff checkbox in sync
  React.useEffect(() => {
    if (!inputs.tearoff) {
      form.setValue("inputs.layers", undefined);
      form.setValue("selections.tearoff_selected", false);
    } else {
      form.setValue("selections.tearoff_selected", true);
      if (!inputs.layers) form.setValue("inputs.layers", 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs.tearoff]);

  // clear quantities when unchecked
  React.useEffect(() => {
    if (!selections.ridge_vent_selected)
      form.setValue("selections.ridge_vent_lf", undefined);
    if (!selections.drip_edge_selected)
      form.setValue("selections.drip_edge_lf", undefined);
    if (!selections.ice_water_selected)
      form.setValue("selections.ice_water_squares", undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selections.ridge_vent_selected,
    selections.drip_edge_selected,
    selections.ice_water_selected,
  ]);

  function toggleSavedItem(id: string, checked: boolean) {
    const cur = selections.selected_saved_custom_item_ids;
    form.setValue(
      "selections.selected_saved_custom_item_ids",
      checked ? [...cur, id] : cur.filter((x) => x !== id),
      { shouldValidate: true }
    );
  }

  function addOneTimeItem() {
    const next: OneTimeCustomItem[] = [
      ...(selections.one_time_custom_items ?? []),
      {
        name: "",
        pricing_type: "flat",
        unit_price: 0,
        taxable: false,
        save_to_account: false,
      },
    ];

    form.setValue("selections.one_time_custom_items", next, {
      shouldValidate: true,
    });
  }

  function updateOneTimeItem(idx: number, patch: Partial<OneTimeCustomItem>) {
    const cur = selections.one_time_custom_items ?? [];
    const next: OneTimeCustomItem[] = cur.map((it, i) =>
      i === idx ? { ...it, ...patch } : it
    );

    const normalized: OneTimeCustomItem[] = next.map((it) =>
      it.pricing_type === "flat"
        ? { ...it, quantity: undefined, unit_label: "" }
        : it
    );

    form.setValue("selections.one_time_custom_items", normalized, {
      shouldValidate: true,
    });
  }

  function removeOneTimeItem(idx: number) {
    const cur = selections.one_time_custom_items ?? [];
    const next: OneTimeCustomItem[] = cur.filter((_, i) => i !== idx);
    form.setValue("selections.one_time_custom_items", next, {
      shouldValidate: true,
    });
  }

  async function saveQuote() {
    setIsSaving(true);
    setSaveMsg(null);

    const payload = form.getValues();
    const valid = RoofingNewQuoteSchema.safeParse(payload);

    if (!valid.success) {
      await form.trigger();
      setIsSaving(false);
      return;
    }

    try {
      const url = editId ? `/api/quotes/${editId}` : "/api/quotes";
      const method = editId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valid.data),
      });

      const json: unknown = await res.json();

      if (!res.ok) {
        const msg =
          typeof json === "object" && json !== null && "error" in json
            ? String((json as { error?: unknown }).error ?? "Failed to save quote")
            : "Failed to save quote";

        setSaveMsg(msg);
        setIsSaving(false);
        return;
      }

      const quoteId = editId
        ? editId
        : typeof json === "object" && json !== null && "quote_id" in json
          ? String((json as { quote_id?: unknown }).quote_id ?? "")
          : "";

      window.location.href = `/quotes/${quoteId}`;
    } catch (e: unknown) {
      setSaveMsg(safeMessage(e));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* LEFT — FORM */}
      <div className="space-y-6 rounded-2xl border bg-card p-5">
        <div className="text-sm text-foreground/80">Quote details</div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs text-foreground/60">Customer name</div>
            <Input
              value={inputs.customer_name}
              onChange={(e) =>
                form.setValue("inputs.customer_name", e.target.value, {
                  shouldValidate: true,
                })
              }
              placeholder="Emily Carter"
            />
            <div className="text-xs text-destructive">
              {form.formState.errors.inputs?.customer_name?.message}
            </div>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <div className="text-xs text-foreground/60">Customer address</div>
            <Textarea
              value={inputs.customer_address ?? ""}
              onChange={(e) =>
                form.setValue("inputs.customer_address", e.target.value, {
                  shouldValidate: true,
                })
              }
              placeholder="456 Maple Dr"
            />
          </div>
        </div>

        <Separator />

        <div className="text-sm text-foreground/80">Roof details</div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <div className="text-xs text-foreground/60">Roof size</div>
            <Input
              type="number"
              value={inputs.roof_size_value}
              onChange={(e) =>
                form.setValue("inputs.roof_size_value", Number(e.target.value), {
                  shouldValidate: true,
                })
              }
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-foreground/60">Unit</div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={inputs.roof_size_unit === "squares" ? "secondary" : "outline"}
                onClick={() =>
                  form.setValue("inputs.roof_size_unit", "squares", {
                    shouldValidate: true,
                  })
                }
              >
                Squares
              </Button>
              <Button
                type="button"
                variant={inputs.roof_size_unit === "sqft" ? "secondary" : "outline"}
                onClick={() =>
                  form.setValue("inputs.roof_size_unit", "sqft", {
                    shouldValidate: true,
                  })
                }
              >
                Sqft
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-foreground/60">Pitch</div>
            <Input
              value={inputs.pitch}
              onChange={(e) =>
                form.setValue("inputs.pitch", e.target.value, {
                  shouldValidate: true,
                })
              }
              placeholder="7/12"
            />
          </div>
        </div>

        <Separator />

        {/* ✅ ADD-ONS (THIS WAS MISSING) */}
        <div className="text-sm text-foreground/80">Add-ons</div>
        <div className="space-y-2">
          <div className="rounded-xl border px-3 py-3 space-y-3">
            {/* Ridge vent */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm text-foreground/85">Ridge vent</div>
                <div className="text-xs text-foreground/60">Per LF</div>
              </div>
              <Checkbox
                checked={selections.ridge_vent_selected}
                onCheckedChange={(v) =>
                  form.setValue("selections.ridge_vent_selected", Boolean(v), {
                    shouldValidate: true,
                  })
                }
              />
            </div>
            {selections.ridge_vent_selected ? (
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs text-foreground/60">Linear feet (LF)</div>
                <NumInput
                  value={selections.ridge_vent_lf}
                  onChange={(n) =>
                    form.setValue("selections.ridge_vent_lf", n, { shouldValidate: true })
                  }
                  placeholder="e.g. 40"
                />
              </div>
            ) : null}

            <Separator />

            {/* Drip edge */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm text-foreground/85">Drip edge</div>
                <div className="text-xs text-foreground/60">Per LF</div>
              </div>
              <Checkbox
                checked={selections.drip_edge_selected}
                onCheckedChange={(v) =>
                  form.setValue("selections.drip_edge_selected", Boolean(v), {
                    shouldValidate: true,
                  })
                }
              />
            </div>
            {selections.drip_edge_selected ? (
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs text-foreground/60">Linear feet (LF)</div>
                <NumInput
                  value={selections.drip_edge_lf}
                  onChange={(n) =>
                    form.setValue("selections.drip_edge_lf", n, { shouldValidate: true })
                  }
                  placeholder="e.g. 120"
                />
              </div>
            ) : null}

            <Separator />

            {/* Ice & water */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm text-foreground/85">Ice & water shield</div>
                <div className="text-xs text-foreground/60">Per square</div>
              </div>
              <Checkbox
                checked={selections.ice_water_selected}
                onCheckedChange={(v) =>
                  form.setValue("selections.ice_water_selected", Boolean(v), {
                    shouldValidate: true,
                  })
                }
              />
            </div>
            {selections.ice_water_selected ? (
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs text-foreground/60">Squares</div>
                <NumInput
                  value={selections.ice_water_squares}
                  onChange={(n) =>
                    form.setValue("selections.ice_water_squares", n, { shouldValidate: true })
                  }
                  placeholder="e.g. 6"
                />
              </div>
            ) : null}

            <Separator />

            {/* One-time fees */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm text-foreground/85">Steep roof charge</div>
                <div className="text-xs text-foreground/60">Flat fee</div>
              </div>
              <Checkbox
                checked={selections.steep_charge_selected}
                onCheckedChange={(v) =>
                  form.setValue("selections.steep_charge_selected", Boolean(v), {
                    shouldValidate: true,
                  })
                }
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm text-foreground/85">Permit fee</div>
                <div className="text-xs text-foreground/60">Flat fee</div>
              </div>
              <Checkbox
                checked={selections.permit_fee_selected}
                onCheckedChange={(v) =>
                  form.setValue("selections.permit_fee_selected", Boolean(v), {
                    shouldValidate: true,
                  })
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="text-sm text-foreground/80">Saved items (My Items)</div>
        <div className="space-y-2">
          {customItems.length === 0 ? (
            <div className="text-sm text-foreground/60">
              No saved items yet. Add some in{" "}
              <a className="underline underline-offset-4" href="/settings/roofing">
                Pricing
              </a>
              .
            </div>
          ) : (
            customItems.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between rounded-xl border px-3 py-2"
              >
                <div className="space-y-0.5">
                  <div className="text-sm">{it.name}</div>
                  <div className="text-xs text-foreground/60">
                    {it.pricing_type === "flat"
                      ? `$${Number(it.unit_price).toFixed(2)} flat`
                      : `$${Number(it.unit_price).toFixed(2)} / ${it.unit_label ?? "unit"}`}
                  </div>
                </div>
                <Checkbox
                  checked={selections.selected_saved_custom_item_ids.includes(it.id)}
                  onCheckedChange={(v) => toggleSavedItem(it.id, Boolean(v))}
                />
              </div>
            ))
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Button type="button" variant="secondary" onClick={addOneTimeItem}>
            Add one-time item
          </Button>

          <Button type="button" onClick={saveQuote} disabled={isSaving}>
            {isSaving ? "Saving..." : editId ? "Save Changes" : "Save Quote"}
          </Button>
        </div>

        {saveMsg ? <div className="text-xs text-destructive">{saveMsg}</div> : null}

        {/* One-time items editor */}
        {selections.one_time_custom_items.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm text-foreground/80">One-time items</div>

            {selections.one_time_custom_items.map((it, idx) => (
              <div key={idx} className="rounded-xl border p-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <div className="text-xs text-foreground/60">Name</div>
                    <Input
                      value={it.name}
                      onChange={(e) => updateOneTimeItem(idx, { name: e.target.value })}
                      placeholder="Chimney flashing"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-foreground/60">Pricing type</div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={it.pricing_type === "flat" ? "secondary" : "outline"}
                        onClick={() => updateOneTimeItem(idx, { pricing_type: "flat" })}
                      >
                        Flat
                      </Button>
                      <Button
                        type="button"
                        variant={it.pricing_type === "per_unit" ? "secondary" : "outline"}
                        onClick={() => updateOneTimeItem(idx, { pricing_type: "per_unit" })}
                      >
                        Per-unit
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-foreground/60">Unit price</div>
                    <Input
                      type="number"
                      value={it.unit_price}
                      onChange={(e) =>
                        updateOneTimeItem(idx, { unit_price: Number(e.target.value) })
                      }
                    />
                  </div>

                  {it.pricing_type === "per_unit" ? (
                    <>
                      <div className="space-y-1">
                        <div className="text-xs text-foreground/60">Quantity</div>
                        <Input
                          type="number"
                          value={it.quantity ?? 1}
                          onChange={(e) =>
                            updateOneTimeItem(idx, { quantity: Number(e.target.value) })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-foreground/60">Unit label</div>
                        <Input
                          value={it.unit_label ?? ""}
                          onChange={(e) =>
                            updateOneTimeItem(idx, { unit_label: e.target.value })
                          }
                          placeholder="each"
                        />
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={Boolean(it.taxable)}
                        onCheckedChange={(v) => updateOneTimeItem(idx, { taxable: Boolean(v) })}
                      />
                      <span className="text-xs text-foreground/70">Taxable</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={Boolean(it.save_to_account)}
                        onCheckedChange={(v) =>
                          updateOneTimeItem(idx, { save_to_account: Boolean(v) })
                        }
                      />
                      <span className="text-xs text-foreground/70">Save to my items</span>
                    </div>
                  </div>

                  <Button type="button" variant="outline" onClick={() => removeOneTimeItem(idx)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* RIGHT — PREVIEW */}
      <div className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-foreground/80">Estimate preview</div>
            <div className="text-xs text-foreground/60">
              Live totals (server recalculates on save)
            </div>
          </div>
          <div className="text-xs text-foreground/60">
            Squares: {toSquares(inputs.roof_size_value, inputs.roof_size_unit).toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl border p-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="text-foreground/80">Totals</div>
            <div className="text-xs text-foreground/60">Markup: {pricing.markup_percent}%</div>
          </div>

          <div className="mt-2 space-y-1 text-foreground/70">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${pricing.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Markup</span>
              <span>${pricing.markup_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>${pricing.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-3 text-sm">
          <div className="text-foreground/80">Line items</div>
          <div className="mt-3 space-y-2">
            {pricing.line_items.map((it, idx) => (
              <div key={idx} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-foreground/80">{it.name}</div>
                  <div className="text-xs text-foreground/60">
                    {it.quantity} {it.unit} × ${Number(it.unit_price).toFixed(2)}
                  </div>
                </div>
                <div className="text-foreground/80">${Number(it.subtotal).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
