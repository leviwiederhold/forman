import { calculateRoofingQuote } from "@/trades/roofing/pricing";
import { DEFAULT_ROOFING_RATE_CARD } from "@/trades/roofing/defaultRateCard";
import type { RoofingNewQuote } from "@/trades/roofing/schema";

export const DEMO_QUOTE_ID = "demo-roofing-quote";
export const DEMO_SHARE_PATH = "/quotes/share/demo-roofing-quote";

export const roofingDemoQuotePayload: RoofingNewQuote = {
  inputs: {
    customer_name: "Sarah Bennett",
    customer_address: "2147 Cedar Ridge Dr, Columbus, OH 43215",
    roof_size_value: 32,
    roof_size_unit: "squares",
    pitch: "8/12",
    stories: 2,
    tearoff: true,
    layers: 1,
  },
  selections: {
    ridge_vent_selected: true,
    ridge_vent_lf: 68,
    drip_edge_selected: true,
    drip_edge_lf: 184,
    ice_water_selected: true,
    ice_water_squares: 8,
    steep_charge_selected: true,
    permit_fee_selected: true,
    tearoff_selected: true,
    selected_saved_custom_item_ids: [],
    one_time_custom_items: [
      {
        name: "Dumpster protection setup",
        pricing_type: "flat",
        unit_price: 225,
        taxable: false,
        save_to_account: false,
      },
      {
        name: "Chimney flashing repair",
        pricing_type: "flat",
        unit_price: 340,
        taxable: false,
        save_to_account: false,
      },
    ],
  },
};

const pricing = calculateRoofingQuote({
  args: roofingDemoQuotePayload,
  rateCard: {
    ...DEFAULT_ROOFING_RATE_CARD,
    markup_percent: 22,
  },
  savedCustomItems: [],
});

const subtotal = pricing.subtotal;
const tax = 0;
const total = pricing.total;
const profit = total - subtotal;
const marginPct = total > 0 ? (profit / total) * 100 : 0;

export const roofingDemoQuote = {
  id: DEMO_QUOTE_ID,
  trade: "roofing",
  label: "Demo quote",
  subtitle: "Sample residential reroof quote using realistic roofing job data.",
  customerName: roofingDemoQuotePayload.inputs.customer_name,
  customerAddress: roofingDemoQuotePayload.inputs.customer_address ?? "",
  createdAtLabel: "Today, 8:14 AM",
  expiresAtLabel: "14 days from issue",
  sharePath: DEMO_SHARE_PATH,
  status: "Viewed by customer",
  statusSteps: [
    { label: "Draft built", state: "complete" as const },
    { label: "Share link sent", state: "complete" as const },
    { label: "Customer viewed", state: "active" as const },
    { label: "Approve online", state: "pending" as const },
    { label: "Collect 20% deposit", state: "pending" as const },
  ],
  shareFlow: {
    shareUrlLabel: `forman.app${DEMO_SHARE_PATH}`,
    approval: "Customer can approve or reject from the share page.",
    followUp: "Viewed status and expiry help the roofer follow up without guessing.",
  },
  deposit: {
    enabled: true,
    percent: 20,
    amount: total * 0.2,
    note: "Deposits appear after approval when Stripe is connected.",
  },
  profitability: {
    subtotal,
    tax,
    total,
    profit,
    marginPct,
  },
  lineItems: pricing.line_items,
  payload: roofingDemoQuotePayload,
};
