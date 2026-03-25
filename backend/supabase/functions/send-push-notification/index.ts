import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import {
  sendExpoPushNotifications,
  ExpoPushMessage,
} from "../_shared/expo-push.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: DeliveryOrderRecord;
  old_record: DeliveryOrderRecord | null;
  schema: string;
}

interface DeliveryOrderRecord {
  id: number;
  order_id: number;
  buyer_id: string;
  seller_id: string;
  dasher_id: string | null;
  status: string;
  listing_title: string;
  order_number: string;
}

interface NotificationConfig {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface PushToken {
  token: string;
  platform: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();

    // Only handle delivery_orders table
    if (payload.table !== "delivery_orders") {
      return new Response(JSON.stringify({ message: "Ignored - wrong table" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newRecord = payload.record;
    const oldRecord = payload.old_record;
    const newStatus = newRecord?.status;
    const oldStatus = oldRecord?.status;

    // Skip if no status change on UPDATE
    if (payload.type === "UPDATE" && newStatus === oldStatus) {
      return new Response(JSON.stringify({ message: "No status change" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notifications: Array<{
      userId: string;
      config: NotificationConfig;
    }> = [];

    const deliveryOrderId = newRecord.id;
    const orderId = newRecord.order_id;
    const listingTitle = newRecord.listing_title || "Your order";

    // Truncate title if too long
    const displayTitle =
      listingTitle.length > 50
        ? listingTitle.substring(0, 47) + "..."
        : listingTitle;

    // Determine who to notify based on status change
    if (payload.type === "INSERT" && newStatus === "pending") {
      // New delivery order created

      // Notify SELLER: item was bought
      if (newRecord.seller_id) {
        notifications.push({
          userId: newRecord.seller_id,
          config: {
            title: "New Sale!",
            body: `${displayTitle} was purchased and is awaiting pickup.`,
            data: {
              type: "seller_item_bought",
              deliveryOrderId,
              screen: "PastOrders",
            },
          },
        });
      }

      // Notify DASHERS: new delivery available
      // Query online dashers (limit to avoid spam)
      const { data: onlineDashers } = await supabase
        .from("dashers")
        .select("id")
        .eq("status", "online")
        .limit(50);

      if (onlineDashers && onlineDashers.length > 0) {
        for (const dasher of onlineDashers) {
          notifications.push({
            userId: dasher.id,
            config: {
              title: "New Delivery Available",
              body: `${displayTitle} is ready for pickup. Tap to view.`,
              data: {
                type: "dasher_new_delivery",
                deliveryOrderId,
                screen: "DashTab",
              },
            },
          });
        }
      }
    } else if (payload.type === "UPDATE") {
      // Status changed
      switch (newStatus) {
        case "picked_up":
          // Notify SELLER: item picked up
          if (newRecord.seller_id) {
            notifications.push({
              userId: newRecord.seller_id,
              config: {
                title: "Item Picked Up",
                body: `${displayTitle} was picked up by the dasher.`,
                data: {
                  type: "seller_item_picked_up",
                  deliveryOrderId,
                  screen: "PastOrders",
                },
              },
            });
          }

          // Notify BUYER: item picked up, on the way
          if (newRecord.buyer_id) {
            notifications.push({
              userId: newRecord.buyer_id,
              config: {
                title: "Out for Delivery",
                body: `${displayTitle} is on its way to you!`,
                data: {
                  type: "buyer_item_picked_up",
                  deliveryOrderId,
                  orderId,
                  screen: "OrderDetails",
                },
              },
            });
          }
          break;

        case "delivered":
          // Notify SELLER: item delivered
          if (newRecord.seller_id) {
            notifications.push({
              userId: newRecord.seller_id,
              config: {
                title: "Delivery Complete",
                body: `${displayTitle} was successfully delivered.`,
                data: {
                  type: "seller_item_delivered",
                  deliveryOrderId,
                  screen: "PastOrders",
                },
              },
            });
          }

          // Notify BUYER: item delivered
          if (newRecord.buyer_id) {
            notifications.push({
              userId: newRecord.buyer_id,
              config: {
                title: "Delivery Complete!",
                body: `${displayTitle} has been delivered. Enjoy!`,
                data: {
                  type: "buyer_item_delivered",
                  deliveryOrderId,
                  orderId,
                  screen: "OrderDetails",
                },
              },
            });
          }
          break;
      }
    }

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No notifications to send" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send notifications
    const results = [];
    for (const notification of notifications) {
      // Get user's active push tokens
      const { data: tokens } = await supabase
        .from("push_tokens")
        .select("token, platform")
        .eq("user_id", notification.userId)
        .eq("is_active", true);

      if (!tokens || tokens.length === 0) {
        console.log(`No active tokens for user ${notification.userId}`);
        continue;
      }

      const messages: ExpoPushMessage[] = (tokens as PushToken[]).map((t) => ({
        to: t.token,
        title: notification.config.title,
        body: notification.config.body,
        data: notification.config.data,
        sound: "default",
        priority: "high",
        channelId: "delivery-updates",
      }));

      const sendResult = await sendExpoPushNotifications(messages);
      results.push({ userId: notification.userId, ...sendResult });

      // Log notification
      await supabase.from("notification_log").insert({
        user_id: notification.userId,
        delivery_order_id: deliveryOrderId,
        notification_type: notification.config.data?.type || "unknown",
        title: notification.config.title,
        body: notification.config.body,
        data: notification.config.data,
        status: sendResult.success ? "sent" : "failed",
        error_message: sendResult.error || null,
        sent_at: new Date().toISOString(),
      });

      // Handle invalid tokens (deactivate them)
      if (sendResult.invalidTokens && sendResult.invalidTokens.length > 0) {
        await supabase
          .from("push_tokens")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in("token", sendResult.invalidTokens);

        console.log(
          `Deactivated ${sendResult.invalidTokens.length} invalid tokens`
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
