import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';

type StepperProps = {
  steps: string[];
  current: number;
};

function StepDot({ index, total, isDone, isActive, isReached, label }: {
  index: number; total: number; isDone: boolean; isActive: boolean; isReached: boolean; label: string;
}) {
  const colors = useThemeColors();
  const scale = useRef(new Animated.Value(isActive ? 1 : 0.85)).current;
  const glow = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isActive ? 1 : isDone ? 0.9 : 0.8,
        useNativeDriver: true, tension: 120, friction: 8,
      }),
      Animated.timing(glow, { toValue: isActive ? 1 : 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [isActive, isDone]);

  return (
    <View style={styles.stepWrap}>
      <Animated.View style={[styles.glowRing, { opacity: glow, transform: [{ scale }], backgroundColor: colors.primary }]} />
      <Animated.View style={[
        styles.circle,
        isDone && { backgroundColor: colors.success },
        isActive && { backgroundColor: colors.primary, shadowColor: colors.primary },
        !isReached && { backgroundColor: colors.backgroundElement, borderColor: colors.border },
        { transform: [{ scale }] },
      ]}>
        {isDone ? (
          <Ionicons name="checkmark" size={15} color={colors.onPrimary} />
        ) : (
          <ThemedText style={[
            styles.circleText,
            isReached ? { color: colors.onPrimary } : { color: colors.textSecondary },
          ]}>
            {index + 1}
          </ThemedText>
        )}
      </Animated.View>
      <ThemedText
        numberOfLines={1}
        style={[
          styles.label,
          { color: colors.textSecondary },
          isActive && { color: colors.text, fontSize: 11 },
          isDone && { color: colors.success },
          !isReached && { color: colors.border },
        ]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

export function Stepper({ steps, current }: StepperProps) {
  const colors = useThemeColors();
  const progress = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface2 }]}>
      <View style={styles.trackContainer}>
        <View style={[styles.track, { backgroundColor: colors.border }]} />
        <View style={[styles.trackFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
      </View>
      <View style={styles.row}>
        {steps.map((label, i) => (
          <StepDot
            key={label}
            index={i}
            total={steps.length}
            isDone={i < current}
            isActive={i === current}
            isReached={i <= current}
            label={label}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 8,
  },
  trackContainer: {
    position: 'absolute',
    top: 27,
    left: 36,
    right: 36,
    height: 3,
  },
  track: {
    ...StyleSheet.absoluteFill,
    borderRadius: 2,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stepWrap: {
    alignItems: 'center',
    width: 64,
  },
  glowRing: {
    position: 'absolute',
    top: -5,
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.18,
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    zIndex: 1,
    borderWidth: 1.5,
  },
  circleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  label: {
    fontSize: 10.5,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
