/**
 * Mirrors /src/types/index.ts. Cloud Functions deploy as a separate
 * package from the RN app, so these types are duplicated rather than
 * imported across the app/functions boundary (a monorepo with a shared
 * `packages/shared-types` workspace is the natural next step if this
 * project grows — noted in README "Next Steps").
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
  dob: string;
  birthPlace: {
    text: string;
    coords: GeoPoint;
    timezone: string;
  };
  birthTime: string | null;
  birthTimeUnknown: boolean;
}

export interface ContactDetails {
  name: string;
  email: string;
  mobile: string;
}

export interface Slot {
  id: string;
  dateISO: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  isBlocked: boolean;
}

export interface Booking {
  id: string;
  userId: string;
  contact: ContactDetails;
  birth: BirthDetails;
  slotId: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentAmountPaise: number;
  createdAt: string;
  updatedAt: string;
}

export interface AstrologerSettings {
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  slotDurationMins: number;
  bufferBetweenSlotsMins: number;
  blackoutDates: string[];
  timezone: string;
  consultationFeePaise: number;
}

export interface CreateBookingInput {
  contact: ContactDetails;
  birth: BirthDetails;
  slotId: string;
}

export interface PaymentIntent {
  bookingId: string;
  amountPaise: number;
  currency: 'INR';
  provider: 'dummy';
  providerReference: string;
}
