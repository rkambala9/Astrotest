import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet, Alert } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';

interface ContactInfo {
  phone: string; // E.164, e.g. "+919812345678"
  email: string;
  whatsapp: string; // E.164, no plus, e.g. "919812345678"
  address: string;
}

// In production this comes from settings/contact in Firestore (same
// CMS-editable pattern as About Us); hardcoded here to keep this file
// focused on the interaction pattern.
const CONTACT_INFO: ContactInfo = {
  phone: '+919812345678',
  email: 'contact@example-astrologer.com',
  whatsapp: '919812345678',
  address: 'Bengaluru, Karnataka, India',
};

async function openLinkSafely(url: string, errorLabel: string): Promise<void> {
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert('Unable to open', `No app found to handle ${errorLabel}.`);
    return;
  }
  await Linking.openURL(url);
}

export function ContactUsScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.heading} accessibilityRole="header">
        Contact Us
      </Text>

      <Pressable
        onPress={() => void openLinkSafely(`tel:${CONTACT_INFO.phone}`, 'phone calls')}
        accessibilityRole="button"
        accessibilityLabel={`Call ${CONTACT_INFO.phone}`}
        style={styles.contactRow}
      >
        <Text style={styles.contactLabel}>📞 Call</Text>
        <Text style={styles.contactValue}>{CONTACT_INFO.phone}</Text>
      </Pressable>

      <Pressable
        onPress={() =>
          void openLinkSafely(`https://wa.me/${CONTACT_INFO.whatsapp}`, 'WhatsApp')
        }
        accessibilityRole="button"
        accessibilityLabel="Message on WhatsApp"
        style={styles.contactRow}
      >
        <Text style={styles.contactLabel}>💬 WhatsApp</Text>
        <Text style={styles.contactValue}>Chat with us</Text>
      </Pressable>

      <Pressable
        onPress={() => void openLinkSafely(`mailto:${CONTACT_INFO.email}`, 'email')}
        accessibilityRole="button"
        accessibilityLabel={`Email ${CONTACT_INFO.email}`}
        style={styles.contactRow}
      >
        <Text style={styles.contactLabel}>✉️ Email</Text>
        <Text style={styles.contactValue}>{CONTACT_INFO.email}</Text>
      </Pressable>

      <View style={styles.contactRow} accessible accessibilityRole="text">
        <Text style={styles.contactLabel}>📍 Address</Text>
        <Text style={styles.contactValue}>{CONTACT_INFO.address}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  heading: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.lg },
  contactRow: {
    minHeight: 56,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    justifyContent: 'center',
  },
  contactLabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.xs },
  contactValue: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
});
