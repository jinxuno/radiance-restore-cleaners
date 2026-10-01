// Shared quote logic for /50-off, /quote and the send-quote function.
// Prices come from pricing-table.js (mirrors tools/content/pricing.json).
import { PRICING } from "./pricing-table.js";

export const OFFER_DISCOUNT = 50;

export const SERVICES = {
  standard: { label: "Standard Clean", table: "Standard Clean", short: "standard clean" },
  deep: { label: "Deep Clean", table: "Deep Clean", short: "deep clean" },
  move: { label: "Move In / Move Out", table: "Move In/Out", short: "move in/out clean" },
};

// Recurring discounts used across the site: weekly 20%, every other week 15%, monthly 10%.
export const FREQUENCIES = {
  biweekly: { label: "Every other week", mult: 0.85, save: "Save 15%", zapier: "0.85" },
  monthly: { label: "Monthly", mult: 0.9, save: "Save 10%", zapier: "0.9" },
  weekly: { label: "Weekly", mult: 0.8, save: "Save 20%", zapier: "0.8" },
  once: { label: "Just once", mult: 1, save: "", zapier: "1" },
};

// Bedrooms -> size tier. Studio to 3 bed follow the pricing document's apartment cheat sheet
// (500 / 750 / 1,000 / 1,250 sq ft). Larger homes and extra bathrooms step up one 250 sq ft
// tier per bathroom beyond the first. Adjust here if the owner wants a different mapping.
const BED_SQFT = { 0: 500, 1: 750, 2: 1000, 3: 1250, 4: 1750, 5: 2250, 6: 2750 };

export function sizeTier(beds, baths) {
  const b = Math.max(0, Math.min(6, Math.round(Number(beds) || 0)));
  const ba = Math.max(1, Number(baths) || 1);
  const extraBaths = Math.ceil(ba - 1);
  const sqft = BED_SQFT[b] + extraBaths * 250;
  return Math.min(12000, Math.max(500, Math.ceil(sqft / 250) * 250));
}

export function buildQuote({ service, beds, baths, freq }) {
  const svc = SERVICES[service];
  const fq = FREQUENCIES[freq];
  if (!svc || !fq) return null;
  const sqft = sizeTier(beds, baths);
  const firstFull = PRICING[svc.table][String(sqft)];
  const standardFull = PRICING["Standard Clean"][String(sqft)];
  const firstWithOffer = Math.max(0, firstFull - OFFER_DISCOUNT);
  // Recurring visits are standard cleans at the recurring discount.
  const recurringPerVisit = freq === "once" ? null : Math.round(standardFull * fq.mult);
  return {
    service,
    serviceLabel: svc.label,
    serviceShort: svc.short,
    freq,
    freqLabel: fq.label,
    beds: Number(beds),
    baths: Number(baths),
    sqft,
    firstFull,
    discount: OFFER_DISCOUNT,
    firstWithOffer,
    recurringPerVisit,
    zapierFrequency: fq.zapier,
  };
}

export function bedLabel(beds) {
  const b = Number(beds);
  if (b === 0) return "Studio";
  if (b >= 6) return "6+ bed";
  return `${b} bed`;
}

export function bathLabel(baths) {
  const b = Number(baths);
  return `${b >= 4 ? "4+" : b} bath`;
}

export const money = (n) => "$" + Number(n).toLocaleString("en-US");
