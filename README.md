# DormDash

**This project uses pnpm. Replace all commands from npm to pnpm equivalent**

deployed on: www.dormdash.xyz

To run project:

1. "cd" into dormdash folder
2. start backend server with "pnpm dlx convex dev"
3. start frontend with "pnpm run start"

Formatting: Run "pnpm format"

Unit Testing: Run "pnpm test"

Deploy and Build script: Run "pnpm deploy"

## Dasher map + live tracking setup

1. Install new mobile dependencies:
   - `cd frontend && pnpm install`
2. Apply Supabase SQL migration:
   - `backend/supabase/migrations/20260210_dasher_tracking.sql`
   - `backend/supabase/migrations/20260211_private_pickup_locations.sql`
   - `backend/supabase/migrations/20260212_split_delivery_orders_by_pickup_location.sql`
3. Configure map tiles (optional):
   - `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (recommended for Mapbox tiles)
   - `EXPO_PUBLIC_MAPBOX_STYLE` (optional, default: `mapbox/streets-v12`)
   - Fallback if no token: `EXPO_PUBLIC_OSM_TILE_URL_TEMPLATE`
4. Run in Expo Go for map testing:
   - `cd frontend && pnpm run start`
