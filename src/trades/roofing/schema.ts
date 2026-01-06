// src/trades/roofing/schema.ts
import { z } from "zod";

// -----------------------------
// Rate Card (stored in rate_cards.rates_json)
// -----------------------------
export const RoofingRateCardSchema = z.object({
  labor_per_square: z.number().min(0),
  shingles_per_square: z.number().min(0),
  underlayment_per_square: z.number().min(0),
  tearoff_disposal_per_square: z.number().min(0),

  minimum_job_price: z.number().min(0),
  markup_percent: z.number().min(0).max(500),

  ridge_vent_per_lf: z.number().min(0),
  drip_edge_per_lf: z.number().min(0),
  ice_water_per_square: z.number().min(0),
  steep_charge_flat: z.number().min(0),
  permit_fee_flat: z.number().min(0),
});

export type RoofingRateCard = z.infer<typeof RoofingRateCardSchema>;

export const ROOFING_RATE_DEFAULTS: RoofingRateCard = {
  labor_per_square: 55,
  shingles_per_square: 115,
  underlayment_per_square: 20,
  tearoff_disposal_per_square: 35,

  minimum_job_price: 4500,
  markup_percent: 15,

  ridge_vent_per_lf: 8.5,
  drip_edge_per_lf: 2.25,
  ice_water_per_square: 45,
  steep_charge_flat: 450,
  permit_fee_flat: 250,
};


// -----------------------------
// Custom Items (My Items)
// -----------------------------
export const CustomItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  pricing_type: z.enum(["flat", "per_unit"]),
  unit_label: z.string().optional().nullable(),
  unit_price: z.number().min(0),
  taxable: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type CustomItem = z.infer<typeof CustomItemSchema>;

export const CreateCustomItemSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    pricing_type: z.enum(["flat", "per_unit"]),
    unit_label: z.string().optional().nullable(),
    unit_price: z.number().min(0),
    taxable: z.boolean(), // REQUIRED for RHF typing
  })
  .refine(
    (v) =>
      v.pricing_type === "per_unit"
        ? !!v.unit_label && v.unit_label.trim().length > 0
        : true,
    { message: "Unit label is required for per-unit items", path: ["unit_label"] }
  );

export type CreateCustomItem = z.infer<typeof CreateCustomItemSchema>;

// -----------------------------
// Roofing Quote (New Quote) schemas
// -----------------------------
export const RoofSizeUnitSchema = z.enum(["squares", "sqft"]);
export type RoofSizeUnit = z.infer<typeof RoofSizeUnitSchema>;

export const RoofingQuoteInputsSchema = z
  .object({
    customer_name: z.string().min(1, "Customer name is required"),
    customer_address: z.string().optional().nullable(),

    roof_size_value: z.number().min(0.01, "Roof size is required"),
    roof_size_unit: RoofSizeUnitSchema,

    pitch: z.string().min(1, "Pitch is required"), // e.g. "7/12"
    stories: z.union([z.literal(1), z.literal(2), z.literal(3)]),

    tearoff: z.boolean(),
    layers: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.tearoff && !val.layers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Layers is required when tear-off is selected",
        path: ["layers"],
      });
    }
    if (!val.tearoff && val.layers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Layers should be empty when tear-off is not selected",
        path: ["layers"],
      });
    }
  });

export const OneTimeCustomItemSchema = z
  .object({
    name: z.string().min(1, "Item name is required"),
    pricing_type: z.enum(["flat", "per_unit"]),
    quantity: z.number().optional(),
    unit_label: z.string().optional().nullable(),
    unit_price: z.number().min(0, "Unit price must be >= 0"),
    taxable: z.boolean().default(false),
    save_to_account: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.pricing_type === "per_unit") {
      if (!val.unit_label || val.unit_label.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Unit label is required for per-unit items",
          path: ["unit_label"],
        });
      }
      if (!val.quantity || val.quantity <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Quantity is required for per-unit items",
          path: ["quantity"],
        });
      }
    }
  });

export const RoofingQuoteSelectionsSchema = z
  .object({
    // Common add-ons selections (not defaults)
    ridge_vent_selected: z.boolean(),
    ridge_vent_lf: z.number().optional(),

    drip_edge_selected: z.boolean(),
    drip_edge_lf: z.number().optional(),

    ice_water_selected: z.boolean(),
    ice_water_squares: z.number().optional(),

    steep_charge_selected: z.boolean(),
    permit_fee_selected: z.boolean(),

    // Custom items
    selected_saved_custom_item_ids: z.array(z.string()).default([]),
    one_time_custom_items: z.array(OneTimeCustomItemSchema).default([]),

    // v1: if tearoff=true we show a checkbox default on; keep in selections for UI
    tearoff_selected: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.ridge_vent_selected && (!val.ridge_vent_lf || val.ridge_vent_lf <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "LF required",
        path: ["ridge_vent_lf"],
      });
    }
    if (val.drip_edge_selected && (!val.drip_edge_lf || val.drip_edge_lf <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "LF required",
        path: ["drip_edge_lf"],
      });
    }
    if (val.ice_water_selected && (!val.ice_water_squares || val.ice_water_squares <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Squares required",
        path: ["ice_water_squares"],
      });
    }
  });

export const RoofingNewQuoteSchema = z.object({
  inputs: RoofingQuoteInputsSchema,
  selections: RoofingQuoteSelectionsSchema,
});

// ✅ Canonical args type/schema for pricing + saving + PDF
export const RoofingQuoteArgsSchema = RoofingNewQuoteSchema;
export type RoofingQuoteArgs = z.infer<typeof RoofingQuoteArgsSchema>;

// Existing exports (keep)
export type RoofingQuoteInputs = z.infer<typeof RoofingQuoteInputsSchema>;
export type RoofingQuoteSelections = z.infer<typeof RoofingQuoteSelectionsSchema>;
export type RoofingNewQuote = z.infer<typeof RoofingNewQuoteSchema>;
export type OneTimeCustomItem = z.infer<typeof OneTimeCustomItemSchema>;
