import * as admin from 'firebase-admin';

admin.initializeApp();

export { createBooking, cancelBooking, rescheduleBooking } from './bookings';
export { generateSlots } from './slots';
export { createPaymentIntent, confirmDummyPayment } from './payment';
export {
  updateAstrologerSettings,
  addBlackoutDate,
  removeBlackoutDate,
} from './admin';
