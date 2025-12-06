"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

export const createCheckoutSession = action({
  args: {
    name: v.string(),
    price: v.number(), // price in cents
  },
  handler: async (ctx, args) => {
    const stripeSecretKey = process.env.STRIPE_SECRET;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET environment variable is not set");
    }

    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: args.name },
            unit_amount: args.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url:
        process.env.SUCCESS_URL || "https://your-website.com/success",
      cancel_url: process.env.CANCEL_URL || "https://your-website.com/cancel",
    });

    return { url: session.url };
  },
});
