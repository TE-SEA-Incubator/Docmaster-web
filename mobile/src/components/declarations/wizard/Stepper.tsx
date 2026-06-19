import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, TEXT_MUTED, TEXT_MAIN, BORDER, GREEN } from './DOC_TYPE_META';

type StepperProps = {
  steps: string[];
  current: number;
};

function StepDot({ index, total, isDone, isActive, isReached, label }: {
  index: number; total: number; isDone: boolean; isActive: boolean; isReached: boolean; label: string;
}) {
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
      <Animated.View style={[styles.glowRing, { opacity: glow, transform: [{ scale }] }]} />
      <Animated.View style={[
        styles.circle,
        isDone && styles.circleDone,
        isActive && styles.circleActive,
        !isReached && styles.circleInactive,
        { transform: [{ scale }] },
      ]}>
        {isDone ? (
          <Ionicons name="checkmark" size={15} color="#fff" />
        ) : (
          <ThemedText style={[styles.circleText, isReached ? styles.circleTextReached : styles.circleTextInactive]}>
            {index + 1}
          </ThemedText>
        )}
      </Animated.View>
      <ThemedText
        numberOfLines={1}
        style={[styles.label, isActive && styles.labelActive, isDone && styles.labelDone, !isReached && styles.labelInactive]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

export function Stepper({ steps, current }: StepperProps) {
  const progress = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.trackContainer}>
        <View style={styles.track} />
        <View style={[styles.trackFill, { width: `${progress}%` }]} />
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
    backgroundColor: '#FAF7F2',
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
    backgroundColor: BORDER,
    borderRadius: 2,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: PRIMARY,
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
    backgroundColor: PRIMARY,
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
  },
  circleDone: {
    backgroundColor: GREEN,
  },
  circleActive: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },
  circleInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  circleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  circleTextReached: {
    color: '#FFFFFF',
  },
  circleTextInactive: {
    color: TEXT_MUTED,
  },
  label: {
    fontSize: 10.5,
    textAlign: 'center',
    color: TEXT_MUTED,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: TEXT_MAIN,
    fontWeight: '800',
    fontSize: 11,
  },
  labelDone: {
    color: GREEN,
    fontWeight: '700',
  },
  labelInactive: {
    color: '#C4BAB0',
  },
});
