import { z } from 'zod';

/**
 * These schemas are intentionally framework-agnostic (pure zod) so the exact
 * same file can be imported by the RN app AND copied into Cloud Functions —
 * client-side validation is UX, this file (run again server-side) is the
 * actual security boundary. Never trust the client-side pass alone.
 */

const E164_MOBILE_REGEX = /^\+[1-9]\d{7,14}$/;

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name is too long'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  mobile: z
    .string()
    .trim()
    .regex(E164_MOBILE_REGEX, 'Enter mobile number with country code, e.g. +91XXXXXXXXXX'),
});

export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const MIN_BIRTH_YEAR = 1900;

export const birthDetailsSchema = z
  .object({
    dob: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be YYYY-MM-DD')
      .refine((val) => {
        const date = new Date(val);
        const year = date.getFullYear();
        const now = new Date();
        return !Number.isNaN(date.getTime()) && year >= MIN_BIRTH_YEAR && date <= now;
      }, 'Enter a valid date of birth (not in the future)'),
    birthPlace: z.object({
      text: z.string().trim().min(2, 'Birth place is required'),
      coords: geoPointSchema,
      timezone: z.string().min(1, 'Timezone could not be resolved for this place'),
    }),
    birthTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Birth time must be HH:mm (24h)')
      .nullable(),
    birthTimeUnknown: z.boolean(),
  })
  .refine(
    (data) => data.birthTimeUnknown || data.birthTime !== null,
    { message: 'Provide a birth time, or mark it as unknown', path: ['birthTime'] },
  );

export const createBookingInputSchema = z.object({
  contact: contactSchema,
  birth: birthDetailsSchema,
  slotId: z.string().min(1, 'A slot must be selected'),
});

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string> };

/**
 * Runs a zod schema and flattens errors into a field-keyed map that's easy
 * to bind directly to form inputs (e.g. errors.mobile -> shown under the field).
 */
export function validate<T>(schema: z.ZodSchema<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_root';
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return { success: false, errors };
}
