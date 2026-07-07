import React from 'react';
import { View, Text, ScrollView, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/services/firebase';
import { colors, spacing, typography } from '@/constants/theme';

interface AboutContent {
  name: string;
  photoUrl: string;
  bio: string;
  credentials: string[];
  specializations: string[];
  yearsExperience: number;
}

/**
 * Content is stored in Firestore (settings/about) rather than hardcoded so
 * the astrologer can update their bio/credentials without an app release —
 * same principle as the calendar settings.
 */
export function AboutUsScreen(): React.JSX.Element {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'about'), (snapshot) => {
      setContent((snapshot.data() as AboutContent | undefined) ?? null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator accessibilityLabel="Loading about page" />
      </View>
    );
  }

  if (!content) {
    return (
      <View style={styles.centered}>
        <Text style={typography.body}>Content coming soon.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image
        source={{ uri: content.photoUrl }}
        style={styles.photo}
        accessibilityLabel={`Photo of ${content.name}`}
      />
      <Text style={styles.name} accessibilityRole="header">
        {content.name}
      </Text>
      <Text style={styles.experience}>{content.yearsExperience}+ years of experience</Text>

      <Text style={styles.sectionLabel} accessibilityRole="header">
        About
      </Text>
      <Text style={styles.bio}>{content.bio}</Text>

      <Text style={styles.sectionLabel} accessibilityRole="header">
        Specializations
      </Text>
      {content.specializations.map((item) => (
        <Text key={item} style={styles.listItem}>
          • {item}
        </Text>
      ))}

      <Text style={styles.sectionLabel} accessibilityRole="header">
        Credentials
      </Text>
      {content.credentials.map((item) => (
        <Text key={item} style={styles.listItem}>
          • {item}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignSelf: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.border,
  },
  name: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  experience: {
    ...typography.body,
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  sectionLabel: {
    ...typography.subheading,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  bio: { ...typography.body, color: colors.textPrimary, lineHeight: 24 },
  listItem: { ...typography.body, color: colors.textPrimary, marginBottom: spacing.xs },
});
