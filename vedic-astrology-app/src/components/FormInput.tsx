import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';

interface FormInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  errorMessage?: string | undefined;
  helperText?: string;
  required?: boolean;
}

/**
 * Accessible text input used across all forms in the app.
 * - Label is always visually present (never placeholder-only, which fails
 *   for users who need the label to remain after they start typing).
 * - Error state is announced to screen readers via accessibilityLiveRegion.
 * - Touch target height respects the 44pt minimum guideline.
 */
export function FormInput({
  label,
  errorMessage,
  helperText,
  required = false,
  ...textInputProps
}: FormInputProps): React.JSX.Element {
  const hasError = Boolean(errorMessage);

  return (
    <View style={styles.container}>
      <Text style={styles.label} accessibilityRole="text">
        {label}
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
      </Text>
      <TextInput
        {...textInputProps}
        style={[styles.input, hasError && styles.inputError]}
        accessibilityLabel={label}
        accessibilityHint={helperText}
        accessibilityState={{ disabled: textInputProps.editable === false }}
        placeholderTextColor={colors.textMuted}
      />
      {helperText && !hasError ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
      {hasError ? (
        <Text
          style={styles.errorText}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  requiredMark: {
    color: colors.danger,
  },
  input: {
    minHeight: 48, // exceeds 44pt minimum touch target guideline
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 2,
  },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
});
