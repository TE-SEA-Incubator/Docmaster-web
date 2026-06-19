# Implementation Plan - Phase 2: Dashboard, Notifications, Subscriptions & Mobile Polish

This phase focuses on correcting mobile login/register screens, fixing the navigation container crash, and building out key features: the Dashboard cards, Notifications, and Subscription screens.

## User Review Required

> [!IMPORTANT]
> - **Mobile Login Layout**: We will remove the card-in-card container for the authentication screens. The forms will layout directly on the screen's background (`bg-bgMain`) to match mobile UI best-practices.
> - **Navigation Crash Fix**: We will relocate the redirection logic out of `app/_layout.tsx` and into `app/(auth)/_layout.tsx` and `app/(tabs)/_layout.tsx`. This guarantees that the routing hooks (`useSegments`, `useRouter`) are evaluated *inside* the mounted navigation container, resolving the crash.

## Proposed Changes

### 1. Navigation Redirect Guards

#### [MODIFY] [Root Layout](file:///home/ruxel/Desktop/docmaster/app/_layout.tsx)
- Remove `NavigationConfig` sibling rendering.
- Register `notifications` and `subscription` stack routes.

#### [MODIFY] [Auth Layout](file:///home/ruxel/Desktop/docmaster/app/(auth)/_layout.tsx)
- Add authenticated-user redirect logic inside a `useEffect` (redirect to `/(tabs)` if `isAuthenticated` is true).

#### [MODIFY] [Tabs Layout](file:///home/ruxel/Desktop/docmaster/app/(tabs)/_layout.tsx)
- Re-write layout to wrap `AppTabs` inside a custom component that checks `isAuthenticated` and redirects to `/(auth)/login` if false.

---

### 2. Mobile Auth Polish

#### [MODIFY] [Login Screen](file:///home/ruxel/Desktop/docmaster/app/(auth)/login.tsx)
- Remove the card style container (`bg-surface rounded-[32px] p-6 border border-borderMain/60 shadow-lg shadow-textMain/5`).
- Position elements directly on the background, maintaining proper spacing and padding.

#### [MODIFY] [Register Screen](file:///home/ruxel/Desktop/docmaster/app/(auth)/register.tsx)
- Remove the card style container.
- Layout fields directly to prevent double boundaries.

#### [MODIFY] [Forgot Password Screen](file:///home/ruxel/Desktop/docmaster/app/(auth)/forgot-password.tsx)
- Remove the card style container.
- Layout fields directly.

---

### 3. Dashboard Features

#### [MODIFY] [Home/Dashboard Screen](file:///home/ruxel/Desktop/docmaster/app/(tabs)/index.tsx)
- Implement a premium dashboard:
  - **Header**: Greeting (`Bonjour, Name`), Notification bell icon (with unread badge counter), Subscription level badge.
  - **Quick Action Buttons**: Two columns: "Déclarer un Perdu" (red-themed) and "Déclarer un Trouvé" (green-themed).
  - **Registered Documents Grid**: Fetch documents using `documentsService.getAll()`. Render cards showing document types, card numbers, status, and verification badges.
  - **Active Declarations List**: Fetch declarations using `declarationsService.getMyDeclarations()`. If declarations exist, display cards showing their status (Pending, Matched, Recovered), reference, and dates. If none, display a friendly placeholder.

---

### 4. New Pages

#### [NEW] [Notifications Screen](file:///home/ruxel/Desktop/docmaster/app/notifications.tsx)
- Fetch notifications using `notificationsService.getAll()`.
- Add "Marquer tout comme lu" button.
- Tap a notification to mark it as read.
- Show clean empty states and premium list styling.

#### [NEW] [Subscription Screen](file:///home/ruxel/Desktop/docmaster/app/subscription.tsx)
- Display current subscription details (Tier, Status, Expiration Date).
- Display premium pricing cards:
  - **Standard (Gratuit)**: 1 active document.
  - **Premium (2,000 FCFA/mois)**: Unlimited documents, priority alerts, document backup.
  - **Business (5,000 FCFA/mois)**: Advanced search & recovery features for centers.
- Include feature checkmarks and custom payment action triggers.

---

## Verification Plan

### Manual Verification
1. Run `npx expo start` and test on Android/iOS/Web:
   - Verify no more "Couldn't find navigation context" errors on boot.
   - Verify login screen is full screen without the floating cards on mobile.
2. Sign in and view the Dashboard:
   - Ensure document cards load correctly from the mock API.
   - Add a declaration and verify the declaration card instantly appears in the "Mes Déclarations" block.
3. Tap the Notification icon:
   - Verify it opens the new Notification Screen. Test marking notifications as read.
4. Tap the Subscription badge:
   - Verify it opens the Subscription Screen. Test tapping a plan.
