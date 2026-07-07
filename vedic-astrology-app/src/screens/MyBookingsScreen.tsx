import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { format } from 'date-fns';
import { useBookings } from '@/hooks/useBookings';
import { cancelBooking } from '@/services/bookingService';
import { colors, spacing, typography } from '@/constants/theme';
import type { Booking } from '@/types';

interface MyBookingsScreenProps {
  userId: string;
  onReschedule: (bookingId: string) => void;
}

const STATUS_LABELS: Record<Booking['status'], string> = {
  pending_payment: 'Awaiting Payment',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
};

export function MyBookingsScreen({
  userId,
  onReschedule,
}: MyBookingsScreenProps): React.JSX.Element {
  const { bookings, loading, error } = useBookings(userId);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function confirmCancel(booking: Booking): void {
    Alert.alert(
      'Cancel this appointment?',
      `${format(new Date(booking.createdAt), 'PPP')} — this cannot be undone.`,
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Cancel appointment',
          style: 'destructive',
          onPress: () => void handleCancel(booking.id),
        },
      ],
    );
  }

  async function handleCancel(bookingId: string): Promise<void> {
    setCancellingId(bookingId);
    try {
      await cancelBooking(bookingId);
    } catch (err) {
      Alert.alert('Could not cancel', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator accessibilityLabel="Loading your bookings" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load bookings: {error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={bookings}
      keyExtractor={(item) => item.id}
      accessibilityLabel="Your appointment bookings"
      ListEmptyComponent={
        <Text style={styles.emptyState}>You have no bookings yet.</Text>
      }
      renderItem={({ item }) => {
        const canModify = item.status === 'confirmed';
        return (
          <View style={styles.card} accessible accessibilityRole="summary">
            <Text style={styles.statusBadge}>{STATUS_LABELS[item.status]}</Text>
            <Text style={styles.cardName}>{item.contact.name}</Text>
            <Text style={styles.cardMeta}>
              Booked on {format(new Date(item.createdAt), 'PPP')}
            </Text>
            {canModify ? (
              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() => onReschedule(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Reschedule appointment booked on ${format(
                    new Date(item.createdAt),
                    'PPP',
                  )}`}
                  style={styles.actionButtonSecondary}
                >
                  <Text style={styles.actionTextSecondary}>Reschedule</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmCancel(item)}
                  disabled={cancellingId === item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel appointment booked on ${format(
                    new Date(item.createdAt),
                    'PPP',
                  )}`}
                  accessibilityState={{ disabled: cancellingId === item.id }}
                  style={styles.actionButtonDanger}
                >
                  {cancellingId === item.id ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <Text style={styles.actionTextDanger}>Cancel</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.body, color: colors.danger },
  emptyState: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusBadge: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  cardName: { ...typography.subheading, color: colors.textPrimary },
  cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionButtonSecondary: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextSecondary: { ...typography.body, color: colors.primary, fontWeight: '600' },
  actionButtonDanger: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextDanger: { ...typography.body, color: colors.danger, fontWeight: '600' },
});
