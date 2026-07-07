import { describe, expect, it } from '@jest/globals';
import {
  contactSchema,
  birthDetailsSchema,
  createBookingInputSchema,
  validate,
} from '../src/utils/validation';

describe('contactSchema', () => {
  it('accepts a valid contact', () => {
    const result = validate(contactSchema, {
      name: 'Ravi Kumar',
      email: 'Ravi@Example.com',
      mobile: '+919812345678',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('ravi@example.com'); // lower-cased
    }
  });

  it('rejects mobile numbers without country code', () => {
    const result = validate(contactSchema, {
      name: 'Ravi Kumar',
      email: 'ravi@example.com',
      mobile: '9812345678',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.mobile).toBeDefined();
    }
  });

  it('rejects malformed email', () => {
    const result = validate(contactSchema, {
      name: 'Ravi Kumar',
      email: 'not-an-email',
      mobile: '+919812345678',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name that is too short', () => {
    const result = validate(contactSchema, {
      name: 'R',
      email: 'ravi@example.com',
      mobile: '+919812345678',
    });
    expect(result.success).toBe(false);
  });
});

describe('birthDetailsSchema', () => {
  const validBirthPlace = {
    text: 'Bengaluru, India',
    coords: { lat: 12.9716, lng: 77.5946 },
    timezone: 'Asia/Kolkata',
  };

  it('accepts a valid birth detail with known time', () => {
    const result = validate(birthDetailsSchema, {
      dob: '1990-05-14',
      birthPlace: validBirthPlace,
      birthTime: '14:30',
      birthTimeUnknown: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts birth time unknown with null time', () => {
    const result = validate(birthDetailsSchema, {
      dob: '1990-05-14',
      birthPlace: validBirthPlace,
      birthTime: null,
      birthTimeUnknown: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects null birth time when not marked unknown', () => {
    const result = validate(birthDetailsSchema, {
      dob: '1990-05-14',
      birthPlace: validBirthPlace,
      birthTime: null,
      birthTimeUnknown: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.birthTime).toBeDefined();
    }
  });

  it('rejects a future DOB', () => {
    const futureYear = new Date().getFullYear() + 1;
    const result = validate(birthDetailsSchema, {
      dob: `${futureYear}-01-01`,
      birthPlace: validBirthPlace,
      birthTime: '10:00',
      birthTimeUnknown: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed birth time', () => {
    const result = validate(birthDetailsSchema, {
      dob: '1990-05-14',
      birthPlace: validBirthPlace,
      birthTime: '25:99',
      birthTimeUnknown: false,
    });
    expect(result.success).toBe(false);
  });
});

describe('createBookingInputSchema', () => {
  it('requires a slotId', () => {
    const result = validate(createBookingInputSchema, {
      contact: { name: 'Ravi Kumar', email: 'ravi@example.com', mobile: '+919812345678' },
      birth: {
        dob: '1990-05-14',
        birthPlace: {
          text: 'Bengaluru, India',
          coords: { lat: 12.9716, lng: 77.5946 },
          timezone: 'Asia/Kolkata',
        },
        birthTime: '10:00',
        birthTimeUnknown: false,
      },
      slotId: '',
    });
    expect(result.success).toBe(false);
  });
});
