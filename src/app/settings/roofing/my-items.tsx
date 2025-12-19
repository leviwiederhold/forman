"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateCustomItemSchema, type CreateCustomItem } from "@/trades/roofing/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DbItem = {
  id: string;
  trade: string;
  name: string;
  pricing_type: "flat" | "per_unit";
  unit_label: string | null;
  unit_price: number;
  taxable: boolean;
  is_active: boolean;
  updated_at: string;
};

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function MyItems({ trade = "roofing" }: { trade?: string }) {
  const [items, setItems] = React.useState<DbItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const form = useForm<CreateCustomItem>({
    resolver: zodResolver(CreateCustomItemSchema),
    defaultValues: {
      name: "",
      pricing_type: "flat",
      unit_label: "",
      unit_price: 0,
      taxable: false,
    },
  });

  const pricingType = form.watch("pricing_type");

  async function load() {
    setLoading(true);
    setErr(null);

    const res = await fetch(`/api/custom-items?trade=${encodeURIComponent(trade)}`);
    if (!res.ok) {
      setErr("Failed to load items.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trade]);

  async function createItem(values: CreateCustomItem) {
    setErr(null);

    const res = await fetch("/api/custom-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trade, item: values }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setErr(j?.error ? String(j.error) : "Failed to create item.");
      return;
    }

    form.reset({ name: "", pricing_type: "flat", unit_label: "", unit_price: 0, taxable: false });
    await load();
  }

  async function toggleActive(id: string, is_active: boolean) {
    const res = await fetch("/api/custom-items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates: { is_active } }),
    });

    if (!res.ok) {
      setErr("Failed to update item.");
      return;
    }

    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, is_active } : it)));
  }

  async function hardDelete(id: string) {
    const res = await fetch(`/api/custom-items?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setErr("Failed to delete item.");
      return;
    }

    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  return (
    <div className="rounded-2xl border bg-card p-5 text-card-foreground">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm text-foreground/80">My Items</div>
          <div className="text-xs text-foreground/60">
            Saved custom items for quotes. Items are never included by default.
          </div>
        </div>

        <Button type="button" variant="secondary" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      {err ? (
        <div className="mt-3 rounded-xl border bg-card p-3 text-sm text-destructive">{err}</div>
      ) : null}

      {/* Create form */}
      <form
        className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-6"
        onSubmit={form.handleSubmit(createItem)}
      >
        <div className="sm:col-span-2">
          <Input placeholder="Item name (e.g., Chimney flashing)" {...form.register("name")} />
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.name?.message}</p>
        </div>

        <div className="sm:col-span-1">
          <Select
            value={form.getValues("pricing_type")}
            onValueChange={(v) => form.setValue("pricing_type", v as "flat" | "per_unit")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Flat</SelectItem>
              <SelectItem value="per_unit">Per unit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-1">
          <Input
            placeholder={pricingType === "per_unit" ? "Unit label (LF, SQ, etc.)" : "Unit label (disabled)"}
            disabled={pricingType !== "per_unit"}
            {...form.register("unit_label")}
          />
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.unit_label?.message}</p>
        </div>

        <div className="sm:col-span-1">
          <Input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="Unit price"
            {...form.register("unit_price", { valueAsNumber: true })}
          />
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.unit_price?.message}</p>
        </div>

        <div className="sm:col-span-1 flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
          <div className="text-xs text-foreground/70">Taxable</div>
          <Checkbox
            checked={!!form.watch("taxable")}
            onCheckedChange={(v) => form.setValue("taxable", Boolean(v))}
          />
        </div>

        <div className="sm:col-span-6 flex items-center justify-end">
          <Button type="submit">Add item</Button>
        </div>
      </form>

      {/* List */}
      <div className="mt-6 overflow-hidden rounded-2xl border">
        <div className="grid grid-cols-12 gap-2 bg-accent px-3 py-2 text-xs text-foreground/70">
          <div className="col-span-5">Name</div>
          <div className="col-span-3">Pricing</div>
          <div className="col-span-2">Taxable</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="px-3 py-4 text-sm text-foreground/60">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-3 py-4 text-sm text-foreground/60">No saved items yet.</div>
        ) : (
          <div className="divide-y">
            {items.map((it) => (
              <div key={it.id} className="grid grid-cols-12 gap-2 px-3 py-3 text-sm">
                <div className="col-span-5">
                  <div className="flex items-center gap-2">
                    <span className={it.is_active ? "" : "line-through opacity-60"}>{it.name}</span>
                    {!it.is_active ? (
                      <span className="rounded-full border px-2 py-0.5 text-xs text-foreground/60">
                        inactive
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="col-span-3 text-foreground/80">
                  {it.pricing_type === "flat"
                    ? `${money(Number(it.unit_price))} flat`
                    : `${money(Number(it.unit_price))} / ${it.unit_label ?? "unit"}`}
                </div>

                <div className="col-span-2 text-foreground/80">{it.taxable ? "Yes" : "No"}</div>

                <div className="col-span-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleActive(it.id, !it.is_active)}
                  >
                    {it.is_active ? "Deactivate" : "Activate"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => hardDelete(it.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-foreground/60">
        Tip: Use “Deactivate” to hide items without losing history.
      </div>
    </div>
  );
}
