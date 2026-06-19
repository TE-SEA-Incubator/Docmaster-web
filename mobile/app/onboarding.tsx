import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useAuthStore } from '@/core/store/useAuthStore';
import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    title: 'Vos documents,\nenfin sécurisés',
    description: 'Ne craignez plus de perdre vos papiers officiels. Stockez-les numériquement, accédez-y instantanément, où que vous soyez.',
    image: require('../assets/onbording/19197294.jpg'),
  },
  {
    id: 2,
    title: 'Une solution contre\nla perte',
    description: 'Perdu ou trouvé un document ? Notre réseau communautaire et nos outils de matching vous aident à les retrouver ou à les restituer rapidement.',
    image: require('../assets/onbording/document-vectoriel-vectoriel-conception-coloree.png'),
  },
  {
    id: 3,
    title: 'Soyez récompensé\npour vos gestes',
    description: 'Rejoignez une communauté solidaire. Aidez les autres à retrouver leurs biens et gagnez des points DocMaster échangeables.',
    image: require('../assets/onbording/59337.jpg'),
  },
];

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const tintColor = Colors.light.tint;

  const handleFinish = async () => {
    await completeOnboarding();
    router.replace('/(auth)');
  };

  const next = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleFinish();
    }
  };

  const slide = SLIDES[currentSlide];

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        key={slide.id}
        entering={FadeInRight.duration(400)}
        exiting={FadeOutLeft.duration(400)}
        style={styles.content}
      >
        <Image source={slide.image} style={styles.illustration} resizeMode="contain" />

        <View style={styles.textContainer}>
          {/* INDICATEURS */}
          <View style={styles.indicatorContainer}>
            {SLIDES.map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.indicator, 
                  currentSlide === i && { backgroundColor: tintColor, width: 20 }
                ]} 
              />
            ))}
          </View>

          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <Pressable style={[styles.nextButton, { backgroundColor: tintColor }]} onPress={next}>
          <Text style={styles.nextButtonText}>
            {currentSlide === SLIDES.length - 1 ? 'COMMENCER' : 'CONTINUER'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4EFE6', // Couleur de fond du thème
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: {
    width: width * 0.8,
    height: width * 0.6,
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C4BAB0',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
