import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, TEXT_MUTED, TEXT_MAIN, BORDER, GREEN } from './DOC_TYPE_META';

type StepperProps = {
  steps: string[];
  current: number; // 0-based index
};

function StepDot({ index, total, isDone, isActive, isReached, label }: {
  index: number;
  total: number;
  isDone: boolean;
  isActive: boolean;
  isReached: boolean;
  label: string;
}) {
  const scale = useRef(new Animated.Value(isActive ? 1 : 0.85)).current;
  const glow = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isActive ? 1 : isDone ? 0.9 : 0.8,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.timing(glow, {
        toValue: isActive ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive, isDone]);

  return (
    <View style={styles.stepWrap}>
      <Animated.View
        style={[
          styles.glowRing,
          {
            opacity: glow,
            transform: [{ scale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circle,
          isDone && styles.circleDone,
          isActive && styles.circleActive,
          !isReached && styles.circleInactive,
          { transform: [{ scale }] },
        ]}
      >
        {isDone ? (
          <Ionicons name="checkmark" size={13} color="#fff" />
        ) : (
          <ThemedText
            style={[
              styles.circleText,
              isReached ? styles.circleTextReached : styles.circleTextInactive,
            ]}
          >
            {index + 1}
          </ThemedText>
        )}
      </Animated.View>
      <ThemedText
        numberOfLines={1}
        style={[
          styles.label,
          isActive && styles.labelActive,
          isDone && styles.labelDone,
          !isReached && styles.labelInactive,
        ]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <View style={styles.container}>
      {/* Progress bar track */}
      <View style={styles.trackContainer}>
        <View style={styles.track} />
        <Animated.View
          style={[
            styles.trackFill,
            {
              width: `${(current / (steps.length - 1)) * 100}%`,
            },
          ]}
        />
      </View>

      <View style={styles.row}>
        {steps.map((label, i) => {
          const isDone = i < current;
          const isActive = i === current;
          const isReached = i <= current;
          return (
            <StepDot
              key={label}
              index={i}
              total={steps.length}
              isDone={isDone}
              isActive={isActive}
              isReached={isReached}
              label={label}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#FAF7F2',
  },
  trackContainer: {
    position: 'absolute',
    top: 22, // align with circle centers
    left: 40,
    right: 40,
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
    width: 60,
  },
  glowRing: {
    position: 'absolute',
    top: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    opacity: 0.18,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    zIndex: 1,
  },
  circleDone: {
    backgroundColor: PRIMARY,
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
    fontSize: 11,
    fontWeight: '800',
  },
  circleTextReached: {
    color: '#FFFFFF',
  },
  circleTextInactive: {
    color: TEXT_MUTED,
  },
  label: {
    fontSize: 9,
    textAlign: 'center',
    color: TEXT_MUTED,
    fontWeight: '600',
    letterSpacing: 0.3,
    maxWidth: 58,
  },
  labelActive: {
    color: TEXT_MAIN,
    fontWeight: '800',
    fontSize: 9.5,
  },
  labelDone: {
    color: PRIMARY,
    fontWeight: '700',
  },
  labelInactive: {
    color: '#C4BAB0',
  },
});