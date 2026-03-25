import React, { ReactNode } from "react";
import { useNotifications } from "../hooks/useNotifications";

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * NotificationProvider initializes push notification handling.
 * Must be placed inside NavigationContainer for navigation to work.
 * Only renders for authenticated users.
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  // Initialize notification handling (permissions, token registration, listeners)
  useNotifications();

  return <>{children}</>;
}
