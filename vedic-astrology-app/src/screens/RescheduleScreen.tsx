import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useSlots } from '@/hooks/useSlots';
import { SlotGrid } from '@/components/SlotGrid';
import { rescheduleBooking } from '@/services/bookingService';
import { colors, spacing, typography } from '@/constants/theme';
import type { Slot } from '@/types';

interface RescheduleScreenProps {
  bookingId: string;
  onDone: () => void;
}

/**
 * Reschedule reuses the same slot inventory/SlotGrid as booking, but skips
 * the contact/birth-details form entirely — those don't change when moving
 * an existing appointment to a new time. Kept as its own screen rather than
 * a "mode" flag on BookAppointmentScreen so each screen keeps one job.
 */
export function RescheduleScreen({ bookingId, onDone }: RescheduleScreenProps): React.JSX.Element {
  const { slots, loading, error } = useSlots();
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    if (!selectedSlot) {
      Alert.alert('Select a slot', 'Please choose a new date and time first.');
      return;
    }
    setSubmitting(true);
    try {
      await rescheduleBooking(bookingId, selectedSlot.id);
      Alert.alert('Rescheduled', 'Your appointment has been moved to the new slot.');
      onDone();
    } catch (err) {
      Alert.alert(
        'Could not reschedule',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading} accessibilityRole="header">
        Choose a New Slot
      </Text>
      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading available slots" />
      ) : error ? (
        <Text style={styles.errorText}>Could not load slots: {error}</Text>
      ) : (
        <SlotGrid
          slots={slots}
          selectedSlotId={selectedSlot?.id ?? null}
          onSelect={setSelectedSlot}
        />
      )}
      <Pressable
        onPress={handleConfirm}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel="Confirm rescheduled slot"
        accessibilityState={{ disabled: submitting, busy: submitting }}
        style={[styles.confirmButton, submitting && styles.confirmButtonDisabled]}
      >
        {submitting ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.confirmButtonText}>Confirm New Slot</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  heading: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.md },
  errorText: { ...typography.body, color: colors.danger },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: { ...typography.body, color: colors.surface, fontWeight: '700' },
});
