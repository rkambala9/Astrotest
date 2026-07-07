import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Slot } from '@/types';
import { colors, spacing, typography, MIN_TOUCH_TARGET } from '@/constants/theme';

interface SlotGridProps {
  slots: Slot[];
  selectedSlotId: string | null;
  onSelect: (slot: Slot) => void;
}

/**
 * Renders bookable time slots as a grid of pressable chips.
 * Accessibility: booked/blocked slots are disabled AND labelled as such
 * for screen readers (not conveyed by color alone), satisfying WCAG 1.4.1.
 */
export function SlotGrid({ slots, selectedSlotId, onSelect }: SlotGridProps): React.JSX.Element {
  if (slots.length === 0) {
    return (
      <Text style={styles.emptyState} accessibilityRole="text">
        No slots available for this date. Please pick another date.
      </Text>
    );
  }

  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {slots.map((slot) => {
        const isUnavailable = slot.isBooked || slot.isBlocked;
        const isSelected = slot.id === selectedSlotId;
        const label = `${slot.startTime} to ${slot.endTime}${
          isUnavailable ? ', unavailable' : ''
        }${isSelected ? ', selected' : ''}`;

        return (
          <Pressable
            key={slot.id}
            disabled={isUnavailable}
            onPress={() => onSelect(slot)}
            accessibilityRole="radio"
            accessibilityState={{ disabled: isUnavailable, selected: isSelected }}
            accessibilityLabel={label}
            style={[
              styles.slotChip,
              isSelected && styles.slotChipSelected,
              isUnavailable && styles.slotChipDisabled,
            ]}
          >
            <Text
              style={[
                styles.slotText,
                isSelected && styles.slotTextSelected,
                isUnavailable && styles.slotTextDisabled,
              ]}
            >
              {slot.startTime}
            </Text>
            {isUnavailable ? <Text style={styles.unavailableTag}>Booked</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotChip: {
    minWidth: MIN_TOUCH_TARGET * 1.4,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  slotChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  slotChipDisabled: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    opacity: 0.6,
  },
  slotText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  slotTextSelected: {
    color: colors.surface,
    fontWeight: '700',
  },
  slotTextDisabled: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  unavailableTag: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyState: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
