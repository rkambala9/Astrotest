/**
 * Domain types for the Vedic Astrology booking app.
 * These mirror the Firestore schema and Cloud Function contracts.
 * Keep this file the single source of truth — do not redefine these
 * shapes inline in screens/services.
 */

export type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type PaymentStatus = 'not_required' | 'pending' | 'paid' | 'failed' | 'refunded';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface BirthDetails {
  dob: string; // ISO date, e.g. "1990-05-14"
  birthPlace: {
    text: string; // human-readable, e.g. "Bengaluru, India"
    coords: GeoPoint;
    timezone: string; // IANA tz, e.g. "Asia/Kolkata" — resolved server-side from coords
  };
  birthTime: string | null; // "HH:mm" 24h, local to birthPlace.timezone
  birthTimeUnknown: boolean; // true if user could not provide an exact time
}

export interface ContactDetails {
  name: string;
  email: string;
  mobile: string; // E.164 format, e.g. "+919812345678"
}

export interface Slot {
  id: string;
  dateISO: string; // "2026-07-10"
  startTime: string; // "HH:mm", astrologer's local time
  endTime: string;
  isBooked: boolean;
  isBlocked: boolean; // astrologer day-off / manual block
}

export interface Booking {
  id: string;
  userId: string;
  contact: ContactDetails;
  birth: BirthDetails;
  slotId: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentAmountPaise: number; // amount in smallest currency unit (paise for INR)
  createdAt: string; // ISO timestamp
  updatedAt: string;
}

export interface AstrologerSettings {
  workingDays: number[]; // 0=Sun..6=Sat
  workStartTime: string; // "10:00"
  workEndTime: string; // "18:00"
  slotDurationMins: number;
  bufferBetweenSlotsMins: number;
  blackoutDates: string[]; // ISO dates fully unavailable
  timezone: string; // astrologer's own IANA timezone
  consultationFeePaise: number;
}

/** Input the client sends when creating a booking. Server re-validates all of it. */
export interface CreateBookingInput {
  contact: ContactDetails;
  birth: BirthDetails;
  slotId: string;
}

export interface PaymentIntent {
  bookingId: string;
  amountPaise: number;
  currency: 'INR';
  provider: 'dummy'; // swap to 'razorpay' | 'stripe' when integrating a real gateway
  providerReference: string;
}
