import { useState, useEffect } from "react";

export interface PriceEstimateResponse {
  unitPrice: number; // single-item price in cents
  quantity: number;
  subtotal: number; // unitPrice * quantity in cents
  tax: number; // Philadelphia 8% sales tax in cents
  estimatedItemPrice: number; // subtotal + tax in cents
  recommendedBountyAmount: number; // estimatedItemPrice + dasher comp in cents
  dasherProfit: number; // in cents
  dasherProfitPercentage: number; // percentage
  confidence: "high" | "medium" | "low";
  reasoning: string;
  mismatchWarning?: string;
}

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "";

const PHILLY_TAX_RATE = 0.08; // Philadelphia, PA sales tax

function calculateDasherCompensation(subtotalWithTax: number) {
  let recommendedMargin: number;
  if (subtotalWithTax < 500) {
    recommendedMargin = 300;
  } else if (subtotalWithTax < 1500) {
    recommendedMargin = 400;
  } else {
    recommendedMargin = 600;
  }
  return {
    recommendedMargin,
    recommendedBountyAmount: subtotalWithTax + recommendedMargin,
  };
}

export const estimateItemPrice = async (
  itemDescription: string,
  storeName: string,
  storeLocation: string,
  quantity: number = 1,
): Promise<PriceEstimateResponse> => {
  try {
    const prompt = `You are a price estimation assistant for a campus delivery app. You must return ACCURATE real-world menu/shelf prices for items at stores near the University of Pennsylvania in Philadelphia, PA.

Item requested: "${itemDescription}"
Store: "${storeName}"
Store location/address: "${storeLocation}"

Respond with a JSON object (no markdown, no code fences, just the raw JSON) with these fields:
{
  "unitPriceCents": <number — the price of ONE unit of this item in US cents at this specific store, based on real 2025-2026 menu/shelf prices>,
  "confidence": "<'high' if you're quite sure about the price, 'medium' if it's a reasonable guess, 'low' if very uncertain>",
  "reasoning": "<1-2 sentence explanation referencing the specific store, item, and current real-world price>",
  "mismatchWarning": "<null if the store likely sells this item, OR a short warning string if the store is unlikely to carry this item>"
}

CRITICAL PRICING RULES:
- Return the price of ONE single item only — quantity is handled separately by the app
- Use REAL current menu prices for chain stores. Examples of accurate 2025-2026 Philadelphia-area prices:
  * Starbucks Iced White Chocolate Mocha (Grande): ~$6.25-$6.75
  * Starbucks Caramel Frappuccino (Grande): ~$5.95-$6.45
  * Wawa Hoagie (Shortie): ~$5.99-$7.49
  * Chick-fil-A Sandwich Meal: ~$9.59-$10.99
  * CVS snacks/drinks: use standard retail pricing
- For local/independent stores near UPenn, estimate based on typical University City pricing
- unitPriceCents must be the price of a SINGLE item, not the total
- Do NOT lowball prices — accuracy matters more than conservatism`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(raw);

    const unitPrice = Math.max(50, Math.round(Number(parsed.unitPriceCents)));
    const subtotal = unitPrice * quantity;
    const tax = Math.round(subtotal * PHILLY_TAX_RATE);
    const estimatedItemPrice = subtotal + tax;

    const confidence: "high" | "medium" | "low" =
      ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium";
    const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "AI-based estimate.";
    const mismatchWarning = typeof parsed.mismatchWarning === "string" ? parsed.mismatchWarning : undefined;

    const { recommendedMargin, recommendedBountyAmount } = calculateDasherCompensation(estimatedItemPrice);

    return {
      unitPrice,
      quantity,
      subtotal,
      tax,
      estimatedItemPrice,
      recommendedBountyAmount,
      dasherProfit: recommendedMargin,
      dasherProfitPercentage: Math.round((recommendedMargin / estimatedItemPrice) * 100),
      confidence,
      reasoning,
      mismatchWarning,
    };
  } catch (error) {
    console.error("Price estimation error:", error);
    return {
      unitPrice: 650,
      quantity: 1,
      subtotal: 650,
      tax: 52,
      estimatedItemPrice: 702,
      recommendedBountyAmount: 1002,
      dasherProfit: 300,
      dasherProfitPercentage: 43,
      confidence: "low",
      reasoning: "Using default estimate due to estimation service unavailability.",
    };
  }
};
