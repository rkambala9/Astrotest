import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { functions, db } from '@/services/firebase';
import { FormInput } from '@/components/FormInput';
import { colors, spacing, typography } from '@/constants/theme';
import type { AstrologerSettings } from '@/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const updateSettingsFn = httpsCallable<AstrologerSettings, { success: true }>(
  functions,
  'updateAstrologerSettings',
);

const addBlackoutDateFn = httpsCallable<{ dateISO: string }, { success: true }>(
  functions,
  'addBlackoutDate',
);

const removeBlackoutDateFn = httpsCallable<{ dateISO: string }, { success: true }>(
  functions,
  'removeBlackoutDate',
);

/**
 * SECURITY: this screen is only reachable from a navigator route that is
 * itself gated behind an isAdmin custom claim check (see AppNavigator.tsx).
 * Even so, every mutation below goes through Cloud Functions which
 * independently re-verify request.auth.token.admin === true — the UI gate
 * is a UX convenience, not the security boundary.
 */
export function AdminCalendarScreen(): React.JSX.Element {
  const [settings, setSettings] = useState<AstrologerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newBlackoutDate, setNewBlackoutDate] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'astrologer'), (snapshot) => {
      const data = snapshot.data() as AstrologerSettings | undefined;
      if (data) {
        setSettings(data);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  function toggleWorkingDay(day: number): void {
    if (!settings) return;
    const workingDays = settings.workingDays.includes(day)
      ? settings.workingDays.filter((d) => d !== day)
      : [...settings.workingDays, day].sort();
    setSettings({ ...settings, workingDays });
  }

  async function handleSaveSettings(): Promise<void> {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettingsFn(settings);
      Alert.alert('Saved', 'Your availability settings have been updated.');
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddBlackoutDate(): Promise<void> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newBlackoutDate)) {
      Alert.alert('Invalid date', 'Use format YYYY-MM-DD');
      return;
    }
    try {
      await addBlackoutDateFn({ dateISO: newBlackoutDate });
      setNewBlackoutDate('');
    } catch (err) {
      Alert.alert('Failed to block date', err instanceof Error ? err.message : 'Try again.');
    }
  }

  async function handleRemoveBlackoutDate(dateISO: string): Promise<void> {
    try {
      await removeBlackoutDateFn({ dateISO });
    } catch (err) {
      Alert.alert('Failed to remove', err instanceof Error ? err.message : 'Try again.');
    }
  }

  if (loading || !settings) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator accessibilityLabel="Loading calendar settings" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading} accessibilityRole="header">
        Manage Availability
      </Text>

      <Text style={styles.sectionLabel} accessibilityRole="header">
        Working Days
      </Text>
      <View style={styles.dayRow} accessibilityRole="none">
        {DAY_LABELS.map((label, index) => {
          const isActive = settings.workingDays.includes(index);
          return (
            <Pressable
              key={label}
              onPress={() => toggleWorkingDay(index)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isActive }}
              accessibilityLabel={`${label}, ${isActive ? 'working day' : 'day off'}`}
              style={[styles.dayChip, isActive && styles.dayChipActive]}
            >
              <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FormInput
        label="Work Start Time"
        helperText="HH:mm, 24-hour"
        value={settings.workStartTime}
        onChangeText={(text) => setSettings({ ...settings, workStartTime: text })}
      />
      <FormInput
        label="Work End Time"
        helperText="HH:mm, 24-hour"
        value={settings.workEndTime}
        onChangeText={(text) => setSettings({ ...settings, workEndTime: text })}
      />
      <FormInput
        label="Slot Duration (minutes)"
        keyboardType="number-pad"
        value={String(settings.slotDurationMins)}
        onChangeText={(text) =>
          setSettings({ ...settings, slotDurationMins: Number(text) || 0 })
        }
      />
      <FormInput
        label="Buffer Between Slots (minutes)"
        keyboardType="number-pad"
        value={String(settings.bufferBetweenSlotsMins)}
        onChangeText={(text) =>
          setSettings({ ...settings, bufferBetweenSlotsMins: Number(text) || 0 })
        }
      />
      <FormInput
        label="Consultation Fee (₹)"
        keyboardType="number-pad"
        value={String(settings.consultationFeePaise / 100)}
        onChangeText={(text) =>
          setSettings({ ...settings, consultationFeePaise: (Number(text) || 0) * 100 })
        }
      />

      <Pressable
        onPress={handleSaveSettings}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Save availability settings"
        accessibilityState={{ busy: saving }}
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
      >
        {saving ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.saveButtonText}>Save Settings</Text>
        )}
      </Pressable>

      <Text style={styles.sectionLabel} accessibilityRole="header">
        Blocked Dates (Days Off)
      </Text>
      <View style={styles.blackoutRow}>
        <View style={styles.blackoutInputWrapper}>
          <FormInput
            label="Add a date to block"
            helperText="YYYY-MM-DD"
            value={newBlackoutDate}
            onChangeText={setNewBlackoutDate}
          />
        </View>
        <Pressable
          onPress={handleAddBlackoutDate}
          accessibilityRole="button"
          accessibilityLabel="Add blocked date"
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>
      {settings.blackoutDates.length === 0 ? (
        <Text style={styles.emptyState}>No blocked dates.</Text>
      ) : (
        settings.blackoutDates.map((dateISO) => (
          <View key={dateISO} style={styles.blackoutItem}>
            <Text style={styles.blackoutDateText}>{dateISO}</Text>
            <Pressable
              onPress={() => void handleRemoveBlackoutDate(dateISO)}
              accessibilityRole="button"
              accessibilityLabel={`Remove blocked date ${dateISO}`}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.md },
  sectionLabel: {
    ...typography.subheading,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  dayRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  dayChip: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  dayChipText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  dayChipTextActive: { color: colors.surface },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { ...typography.body, color: colors.surface, fontWeight: '700' },
  blackoutRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  blackoutInputWrapper: { flex: 1 },
  addButton: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  addButtonText: { ...typography.body, color: colors.surface, fontWeight: '700' },
  emptyState: { ...typography.body, color: colors.textMuted },
  blackoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  blackoutDateText: { ...typography.body, color: colors.textPrimary },
  removeText: { ...typography.body, color: colors.danger, fontWeight: '600' },
});
