# DormDash - Project Overview

## 1. Project Summary
DormDash is a full-stack cross-platform application (Web, iOS, Android) designed for campus delivery or marketplace services. It leverages a modern stack with **Expo (React Native)** for the frontend and **Convex** for the backend, with **Supabase** handling authentication and **Stripe** for payments.

**Website:** [www.dormdash.xyz](https://www.dormdash.xyz)

## 2. Technical Architecture

### Frontend (`/frontend`)
*   **Framework:** React Native with Expo (SDK 54).
*   **Web Support:** React Native Web (deployed to Cloudflare Pages via Wrangler).
*   **Language:** TypeScript.
*   **State Management:** TanStack React Query.
*   **UI Library:** React Native Elements (`@rneui/themed`), Lucide Icons.
*   **Navigation:** React Navigation (Native Stack, Bottom Tabs).
*   **Authentication:** Supabase Auth (via `@supabase/supabase-js`).
*   **Environment Variables:** Managed via `.env` files (e.g., `EXPO_PUBLIC_SUPABASE_URL`).

### Backend (`/backend`)
*   **Platform:** Convex (Serverless functions and database).
*   **Language:** TypeScript.
*   **Payments:** Stripe integration via Convex Actions.
*   **API:** Convex RPCs (Queries/Mutations) and HTTP Actions (e.g., `/create-checkout-session`).

## 3. Setup & Installation

### Prerequisites
*   Node.js
*   pnpm (Project uses pnpm exclusively)

### Initial Setup
1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd DormDash
    ```

2.  **Install dependencies:**
    ```bash
    # Root level installation (if workspace configured) or individual folders
    cd backend && pnpm install
    cd ../frontend && pnpm install
    ```

3.  **Environment Variables:**
    *   Ensure `.env.local` or `.env` in `frontend/` contains:
        *   `EXPO_PUBLIC_SUPABASE_URL`
        *   `EXPO_PUBLIC_SUPABASE_ANON_KEY`
    *   Ensure Convex is configured via `pnpm dlx convex dev`.

## 4. Development Workflow

### Running the Project
The project requires running both the backend and frontend simultaneously.

1.  **Start Backend (Convex):**
    ```bash
    cd backend
    pnpm dlx convex dev
    ```

2.  **Start Frontend (Expo):**
    ```bash
    cd frontend
    pnpm run start
    # Options:
    # Press 'w' for Web
    # Press 'i' for iOS (Simulator)
    # Press 'a' for Android (Emulator)
    ```

### Testing
*   **Unit Tests:** Uses Jest.
    ```bash
    cd frontend
    pnpm test
    ```

### Code Formatting
*   **Prettier:**
    ```bash
    pnpm format
    ```

## 5. Deployment

### Web Deployment (Cloudflare Pages)
The web version is deployed using Wrangler.
```bash
cd frontend
pnpm deploy
```
This command runs:
1.  `pnpm run build:web` (Expo export to `dist/`)
2.  `wrangler pages deploy dist`

### Backend Deployment
Managed via Convex CLI.
```bash
cd backend
pnpm run deploy
```

## 6. Key File Structures

*   `frontend/src/lib/supabase.ts`: Supabase client initialization.
*   `frontend/navigation/`: App navigation logic (Stacks, Tabs).
*   `frontend/screens/`: Main UI screens (Auth, Feed, Cart, etc.).
*   `backend/convex/`: Backend logic.
    *   `http.ts`: HTTP endpoints (e.g., Stripe webhooks/checkout).
    *   `schema.ts`: Database schema definitions (implied).

## 7. UI Design System ("Unique" Theme)

The app uses a custom visual style defined in `frontend/src/assets/styles.ts`.

### Key Characteristics
*   **Navigation:** A floating, glassmorphic capsule tab bar (`AppNavigator.tsx`) with animated Lucide icons.
*   **Cards:** "Poster" style listings (`ListingCard.tsx`) where the image is the container, with dark overlays for text and glass pills for badges.
*   **Typography:** Bold, heavy headings (System font, weight 800/700) with "Inter"-like styling.
*   **Backgrounds:** Light gray (`#F8FAFC`) with subtle watermark decorations (e.g., large rotated icons).
*   **Glassmorphism:** Used for pills, tab bars, and overlays (`Colors.glass_bg`, `Shadows.glow`).

### Iconography
*   **Library:** `lucide-react-native`.
*   **Usage:**
    *   **Active State:** Thicker stroke (2.5), filled with `primary_accent` (low opacity), and a dot indicator.
    *   **Inactive State:** Thinner stroke (2), muted gray.

