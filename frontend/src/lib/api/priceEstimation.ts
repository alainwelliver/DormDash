import { useState, useEffect } from "react";

export interface PriceEstimateResponse {
  estimatedItemPrice: number; // in cents
  recommendedBountyAmount: number; // in cents
  dasherProfit: number; // in cents
  dasherProfitPercentage: number; // percentage
  confidence: "high" | "medium" | "low";
  reasoning: string;
  mismatchWarning?: string;
}

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "";

function calculateDasherCompensation(estimatedItemPrice: number) {
  let recommendedMargin: number;
  if (estimatedItemPrice < 500) {
    recommendedMargin = 300;
  } else if (estimatedItemPrice < 1500) {
    recommendedMargin = 400;
  } else {
    recommendedMargin = 600;
  }
  return {
    recommendedMargin,
    recommendedBountyAmount: estimatedItemPrice + recommendedMargin,
  };
}

export const estimateItemPrice = async (
  itemDescription: string,
  storeName: string,
  storeLocation: string,
): Promise<PriceEstimateResponse> => {
  try {
    const prompt = `You are a price estimation assistant for a campus delivery app near the University of Pennsylvania in Philadelphia. A student wants someone to pick up an item for them.

Item requested: "${itemDescription}"
Store: "${storeName}"
Store location/address: "${storeLocation}"

Respond with a JSON object (no markdown, no code fences, just the raw JSON) with these fields:
{
  "estimatedItemPriceCents": <number — your best estimate of the item's price in US cents at this specific store>,
  "confidence": "<'high' if you're quite sure about the price, 'medium' if it's a reasonable guess, 'low' if very uncertain>",
  "reasoning": "<1-2 sentence explanation of your estimate, referencing the specific store and item>",
  "mismatchWarning": "<null if the store likely sells this item, OR a short warning string if the store is unlikely to carry this item — e.g. 'Target typically doesn't sell freshly made iced coffee'>"
}

Guidelines:
- Use real-world 2025-2026 pricing for well-known stores (Starbucks, Wawa, CVS, Target, Whole Foods, etc.)
- Account for Philadelphia / University City area pricing
- For unknown stores, estimate based on the type of store and item
- Be accurate — students rely on this to set fair bounty amounts
- The mismatchWarning should only be set when the store clearly doesn't sell that type of item`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(raw);

    const estimatedItemPrice = Math.max(50, Math.round(Number(parsed.estimatedItemPriceCents)));
    const confidence: "high" | "medium" | "low" =
      ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium";
    const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "AI-based estimate.";
    const mismatchWarning = typeof parsed.mismatchWarning === "string" ? parsed.mismatchWarning : undefined;

    const { recommendedMargin, recommendedBountyAmount } = calculateDasherCompensation(estimatedItemPrice);

    return {
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
      estimatedItemPrice: 1000,
      recommendedBountyAmount: 1300,
      dasherProfit: 300,
      dasherProfitPercentage: 30,
      confidence: "low",
      reasoning: "Using default estimate due to estimation service unavailability.",
    };
  }
};
