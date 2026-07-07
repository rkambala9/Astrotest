import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { startPaymentForBooking } from '@/services/paymentService';
import { colors, spacing, typography } from '@/constants/theme';

interface PaymentScreenProps {
  bookingId: string;
  amountPaise: number;
  onPaymentSuccess: () => void;
  onPaymentFailure: (reason: string) => void;
}

/**
 * DEMO MODE BANNER: this screen visibly tells the user (and QA) that no
 * real money is involved, so nobody mistakes a dummy transaction for a
 * live charge during testing or a demo to stakeholders.
 */
export function PaymentScreen({
  bookingId,
  amountPaise,
  onPaymentSuccess,
  onPaymentFailure,
}: PaymentScreenProps): React.JSX.Element {
  const [processing, setProcessing] = useState(false);
  const rupees = (amountPaise / 100).toFixed(2);

  async function handlePay(): Promise<void> {
    setProcessing(true);
    try {
      const result = await startPaymentForBooking(bookingId);
      if (result.success) {
        onPaymentSuccess();
      } else {
        onPaymentFailure(result.failureReason ?? 'Payment could not be completed');
      }
    } catch (err) {
      onPaymentFailure(err instanceof Error ? err.message : 'Payment failed unexpectedly');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.demoBanner} accessibilityRole="alert">
        <Text style={styles.demoBannerText}>
          DEMO MODE — no real payment will be charged
        </Text>
      </View>

      <Text style={styles.heading} accessibilityRole="header">
        Confirm Payment
      </Text>
      <Text style={styles.amount}>₹{rupees}</Text>
      <Text style={styles.subtext}>Consultation fee</Text>

      <Pressable
        onPress={handlePay}
        disabled={processing}
        accessibilityRole="button"
        accessibilityLabel="Pay now, simulated demo payment"
        accessibilityState={{ disabled: processing, busy: processing }}
        style={[styles.payButton, processing && styles.payButtonDisabled]}
      >
        {processing ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.payButtonText}>Pay Now (Demo)</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    alignItems: 'center',
  },
  demoBanner: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    width: '100%',
  },
  demoBannerText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '700',
    textAlign: 'center',
  },
  heading: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.sm },
  amount: { fontSize: 36, fontWeight: '700', color: colors.primary },
  subtext: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { ...typography.body, color: colors.surface, fontWeight: '700' },
});
