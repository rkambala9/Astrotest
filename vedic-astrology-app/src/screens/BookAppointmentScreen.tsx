import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import { FormInput } from '@/components/FormInput';
import { SlotGrid } from '@/components/SlotGrid';
import { useSlots } from '@/hooks/useSlots';
import { createBookingInputSchema, validate } from '@/utils/validation';
import { createBooking } from '@/services/bookingService';
import { colors, spacing, typography } from '@/constants/theme';
import type { CreateBookingInput, Slot } from '@/types';

type FormState = {
  name: string;
  email: string;
  mobile: string;
  dob: string;
  birthPlaceText: string;
  birthTime: string;
  birthTimeUnknown: boolean;
};

const INITIAL_FORM_STATE: FormState = {
  name: '',
  email: '',
  mobile: '',
  dob: '',
  birthPlaceText: '',
  birthTime: '',
  birthTimeUnknown: false,
};

interface BookAppointmentScreenProps {
  /** Navigates to the payment screen once a pending booking is created. */
  onBookingCreated: (bookingId: string, amountPaise: number) => void;
}

/**
 * NOTE on birthPlace geocoding: in production this field is backed by a
 * Places Autocomplete component that resolves free text into
 * { lat, lng, timezone } server-side (see backend/functions/src/bookings.ts).
 * This screen keeps the UI concern (typed text) separate from that
 * resolution, which happens as part of createBooking's server-side call.
 */
export function BookAppointmentScreen({
  onBookingCreated,
}: BookAppointmentScreenProps): React.JSX.Element {
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { slots, loading: slotsLoading, error: slotsError } = useSlots();

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildInput(): CreateBookingInput | null {
    if (!selectedSlot) {
      setErrors((prev) => ({ ...prev, slotId: 'Please select a date and time slot' }));
      return null;
    }

    // NOTE: coords/timezone below are placeholders until the Places
    // Autocomplete integration resolves them; the server re-resolves and
    // re-validates regardless (see createBooking Cloud Function).
    const candidate: CreateBookingInput = {
      contact: { name: form.name, email: form.email, mobile: form.mobile },
      birth: {
        dob: form.dob,
        birthPlace: { text: form.birthPlaceText, coords: { lat: 0, lng: 0 }, timezone: '' },
        birthTime: form.birthTimeUnknown ? null : form.birthTime,
        birthTimeUnknown: form.birthTimeUnknown,
      },
      slotId: selectedSlot.id,
    };

    const result = validate(createBookingInputSchema, candidate);
    if (!result.success) {
      setErrors(result.errors);
      return null;
    }
    setErrors({});
    return result.data;
  }

  async function handleSubmit(): Promise<void> {
    setSubmitError(null);
    const input = buildInput();
    if (!input) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await createBooking(input);
      onBookingCreated(response.bookingId, response.amountPaise);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? `Booking failed: ${err.message}`
          : 'Booking failed. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityLabel="Book an appointment form"
    >
      <Text style={styles.heading} accessibilityRole="header">
        Book an Appointment
      </Text>

      <FormInput
        label="Full Name"
        required
        value={form.name}
        onChangeText={(text) => updateField('name', text)}
        errorMessage={errors['contact.name']}
        autoComplete="name"
      />
      <FormInput
        label="Email"
        required
        value={form.email}
        onChangeText={(text) => updateField('email', text)}
        errorMessage={errors['contact.email']}
        keyboardType="email-address"
        autoComplete="email"
        autoCapitalize="none"
      />
      <FormInput
        label="Mobile Number"
        required
        helperText="Include country code, e.g. +91"
        value={form.mobile}
        onChangeText={(text) => updateField('mobile', text)}
        errorMessage={errors['contact.mobile']}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
      <FormInput
        label="Date of Birth"
        required
        helperText="Format: YYYY-MM-DD"
        value={form.dob}
        onChangeText={(text) => updateField('dob', text)}
        errorMessage={errors['birth.dob']}
      />
      <FormInput
        label="Birth Place"
        required
        helperText="City, State, Country"
        value={form.birthPlaceText}
        onChangeText={(text) => updateField('birthPlaceText', text)}
        errorMessage={errors['birth.birthPlace.text']}
      />
      <FormInput
        label="Birth Time"
        helperText={
          form.birthTimeUnknown
            ? "Marked as unknown — that's fine, the astrologer can still help"
            : 'Format: HH:mm, 24-hour (e.g. 14:30)'
        }
        value={form.birthTime}
        onChangeText={(text) => updateField('birthTime', text)}
        errorMessage={errors['birth.birthTime']}
        editable={!form.birthTimeUnknown}
      />
      <Pressable
        onPress={() => updateField('birthTimeUnknown', !form.birthTimeUnknown)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: form.birthTimeUnknown }}
        accessibilityLabel="I don't know my exact birth time"
        style={styles.checkboxRow}
      >
        <View style={[styles.checkbox, form.birthTimeUnknown && styles.checkboxChecked]} />
        <Text style={styles.checkboxLabel}>I don&apos;t know my exact birth time</Text>
      </Pressable>

      <Text style={styles.sectionLabel} accessibilityRole="header">
        Select a Date &amp; Time Slot
      </Text>
      {slotsLoading ? (
        <ActivityIndicator accessibilityLabel="Loading available slots" />
      ) : slotsError ? (
        <Text style={styles.errorBanner}>Could not load slots: {slotsError}</Text>
      ) : (
        <SlotGrid
          slots={slots}
          selectedSlotId={selectedSlot?.id ?? null}
          onSelect={setSelectedSlot}
        />
      )}
      {errors.slotId ? <Text style={styles.errorBanner}>{errors.slotId}</Text> : null}
      {selectedSlot ? (
        <Text style={styles.selectedSlotSummary}>
          Selected: {format(new Date(selectedSlot.dateISO), 'PPP')} at{' '}
          {selectedSlot.startTime}
        </Text>
      ) : null}

      {submitError ? <Text style={styles.errorBanner}>{submitError}</Text> : null}

      <Pressable
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel="Confirm booking details and proceed"
        accessibilityState={{ disabled: submitting, busy: submitting }}
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
      >
        {submitting ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.submitButtonText}>Continue to Payment</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  heading: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.md },
  sectionLabel: {
    ...typography.subheading,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.sm,
  },
  checkboxChecked: { backgroundColor: colors.primary },
  checkboxLabel: { ...typography.body, color: colors.textPrimary },
  selectedSlotSummary: {
    ...typography.body,
    color: colors.success,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  errorBanner: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { ...typography.body, color: colors.surface, fontWeight: '700' },
});
