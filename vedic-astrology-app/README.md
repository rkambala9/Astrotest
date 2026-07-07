# Vedic Astrology App

Hybrid mobile app (React Native + Expo, TypeScript) for a Vedic astrology
consultation practice: About Us, Contact Us, and Book an Appointment with
live slot availability, booking management, an in-app admin calendar for
the astrologer, and a dummy payment integration.

## Stack

- **Client**: React Native + Expo, TypeScript (strict mode)
- **Backend**: Firebase — Firestore (data), Cloud Functions (all business
  logic and writes), Firebase Auth (phone OTP for users, custom claim for admin)
- **Validation**: Zod schemas, duplicated intentionally client-side (UX)
  and server-side (the actual security boundary)
- **Payment**: dummy provider behind a `PaymentProvider` interface —
  swappable for Razorpay/Stripe with no screen-level changes

## Project layout

```
src/                        # React Native app
  types/                    # domain types (single source of truth for the client)
  utils/validation.ts       # zod schemas (client-side copy)
  services/                 # firebase.ts, bookingService.ts, paymentService.ts
  hooks/                    # useSlots, useBookings
  components/               # FormInput, SlotGrid (accessible, reusable)
  screens/                  # AboutUs, ContactUs, BookAppointment, Payment, MyBookings
  screens/admin/            # AdminCalendarScreen (astrologer-only)
  navigation/AppNavigator.tsx

backend/
  firestore.rules           # deny-by-default security rules
  firestore.indexes.json
  functions/src/
    bookings.ts             # createBooking / cancelBooking / rescheduleBooking (transactional)
    slots.ts                # slot generation from AstrologerSettings
    payment.ts              # DUMMY payment intent + confirmation
    admin.ts                # admin-claim-gated settings management
    validation.ts           # zod schemas (server-side copy, the real boundary)

tests/
  validation.test.ts        # unit tests for validation rules
  bookingTransaction.test.ts # concurrency test: 100 simultaneous bookings on one slot
  load/booking-load-test.js # k6 script for the 100-concurrent-user NFR
```

## Why the architecture is shaped this way

**All writes go through Cloud Functions, never direct Firestore writes
from the client.** `backend/firestore.rules` denies client writes to
`bookings`, `slots`, and `settings` entirely. This is what makes the
slot-locking transaction, server-side validation, and admin-claim checks
impossible to bypass — a modified client build gains nothing, because the
server re-validates and re-authorizes everything regardless of what the
client sends.

**Validation is duplicated on purpose**, once in `src/utils/validation.ts`
(fast inline form feedback) and once in `backend/functions/src/validation.ts`
(the actual gate before any write). If these ever drift, the server copy
wins; that's the design.

**Payment is a dummy behind an interface** (`PaymentProvider` in
`paymentService.ts`) so the entire booking-to-payment-to-confirmation flow
works end-to-end today. Swapping to a real gateway later touches exactly
one file client-side and one function server-side; see the comment block
at the top of `backend/functions/src/payment.ts` for the migration steps.
**No real payment gateway has been integrated; do not deploy this as-is
and expect to take real payments.**

## How the three cross-cutting requirements are addressed

### Security
- Deny-by-default Firestore rules; all mutations via Cloud Functions
- Server-side re-validation of every field (never trusts client validation)
- Ownership checks on every booking mutation (`booking.userId === caller`)
- Admin actions gated by a Firebase Auth custom claim, checked server-side
- Firebase App Check recommended before production launch (not yet wired
  up, see Next Steps) to block non-app callers of these functions
- No secrets (Places API key, SMS/email provider keys) belong in the RN
  bundle; proxy those through Cloud Functions when you wire them in

### Performance (100 concurrent users)
- The contention-prone path (booking the same slot) uses a Firestore
  transaction (`bookings.ts`), which Firestore retries automatically on
  conflict, guaranteeing exactly one winner with no manual locking
- `tests/bookingTransaction.test.ts` proves this directly: 100 simultaneous
  requests for one slot resolve to exactly 1 success + 99 clean rejections
- `tests/load/booking-load-test.js` (k6) load-tests the full HTTP path at
  100 concurrent virtual users with a p95 < 1s threshold
- Reads (slot browsing, About Us) are the cheap, scalable path; writes
  (booking) are the expensive path; this is why only writes get the
  transactional treatment

### Accessibility
- `FormInput` and `SlotGrid` components bake in `accessibilityLabel`,
  `accessibilityRole`, `accessibilityState`, and live-region error
  announcements, used consistently rather than improvised per-screen
- Minimum 44 to 48pt touch targets throughout (`constants/theme.ts`)
- All theme colors are pre-checked for WCAG AA contrast (4.5:1 or better)
- Slot availability is conveyed by text ("Booked") plus strikethrough,
  never color alone
- ESLint's `plugin:react-native/all` is enabled to catch regressions

## Setup

```bash
# Client
npm install
cp .env.example .env   # fill in Firebase config values
npm run typecheck && npm run lint && npm test
npm run test:concurrency   # requires the Firebase emulator; proves the 100-concurrent-user guarantee
npm start

# Backend
cd backend/functions
npm install
npm run build
firebase emulators:start   # local dev
firebase deploy --only functions,firestore   # production
```

Setting the admin claim (one-time, run from a trusted environment, never
from the app):

```js
admin.auth().setCustomUserClaims(astrologerUid, { admin: true });
```

## What's intentionally not built yet (next steps, by priority)

1. **Real payment gateway** (Razorpay is the common choice for India);
   replace `payment.ts` per its migration comment. This is the biggest
   gap before any real launch.
2. **Firebase App Check**, to block abusive/non-app traffic to Cloud
   Functions; recommended before opening this up publicly.
3. **SMS/email notifications** on booking confirm/cancel/reschedule
   (Twilio/MSG91 + SendGrid); currently the app assumes in-app status only.
4. **Places Autocomplete** wiring for birth place to lat/lng/timezone
   resolution (the field exists in the schema; the UI component that
   calls the Places API isn't wired in yet).
5. **Shared types package** if this grows; right now `src/types` and
   `backend/functions/src/types.ts` are manually kept in sync. A monorepo
   workspace removes that duplication.
6. **E2E tests** (Detox or Maestro) for the full booking flow on-device,
   complementing the unit/concurrency tests included here.
7. **CI pipeline** (GitHub Actions) running lint, typecheck, and test on
   every PR; scripts are all in place, just needs the workflow file.
