export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  priority?: "default" | "normal" | "high";
  channelId?: string;
  badge?: number;
}

export interface ExpoPushResult {
  success: boolean;
  ticketIds?: string[];
  error?: string;
  invalidTokens?: string[];
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendExpoPushNotifications(
  messages: ExpoPushMessage[]
): Promise<ExpoPushResult> {
  if (messages.length === 0) {
    return { success: true, invalidTokens: [] };
  }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Expo API error: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json();
    const invalidTokens: string[] = [];
    const ticketIds: string[] = [];

    // Check for invalid tokens in response
    if (result.data && Array.isArray(result.data)) {
      result.data.forEach((ticket: { status: string; id?: string; details?: { error?: string } }, index: number) => {
        if (ticket.status === "ok" && ticket.id) {
          ticketIds.push(ticket.id);
        } else if (ticket.status === "error") {
          if (
            ticket.details?.error === "DeviceNotRegistered" ||
            ticket.details?.error === "InvalidCredentials"
          ) {
            invalidTokens.push(messages[index].to);
          }
        }
      });
    }

    return {
      success: true,
      ticketIds,
      invalidTokens,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
