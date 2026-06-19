import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, Dimensions, Pressable, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Circle, Rect, Polygon, Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = 180;
const AUTO_SCROLL_INTERVAL = 5000;

interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  accentColor: string;
  pattern: 'circles' | 'diamonds' | 'waves' | 'grid';
}

const BANNERS: BannerItem[] = [
  {
    id: '1',
    title: 'Protégez\nvos documents',
    subtitle: 'Sécurisez vos pièces importantes en un clic',
    icon: 'shield-checkmark-outline',
    gradient: ['#1E3A2F', '#2D5A42'],
    accentColor: '#F5A64B',
    pattern: 'circles',
  },
  {
    id: '2',
    title: 'Déclaration\nrapide',
    subtitle: 'Signalez un document perdu ou trouvé en quelques secondes',
    icon: 'flash-outline',
    gradient: ['#D97706', '#F5A64B'],
    accentColor: '#FFFFFF',
    pattern: 'diamonds',
  },
  {
    id: '3',
    title: 'Communauté\nsolidaire',
    subtitle: 'Rejoignez des milliers d\'utilisateurs engagés',
    icon: 'people-outline',
    gradient: ['#3B82F6', '#60A5FA'],
    accentColor: '#FFFFFF',
    pattern: 'waves',
  },
  {
    id: '4',
    title: 'Gagnez des\nrécompenses',
    subtitle: 'Helpez les autres et accumulez des points',
    icon: 'gift-outline',
    gradient: ['#7C3AED', '#A78BFA'],
    accentColor: '#FDE68A',
    pattern: 'grid',
  },
];

const BANNER_ROUTES: Record<string, string> = {
  '1': '/(tabs)/documents',
  '2': '/(tabs)/declarer',
  '3': '/(tabs)/parrainage',
  '4': '/(tabs)/gains',
};

const CirclesPattern = React.memo(({ color }: { color: string }) => (
  <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={{ position: 'absolute', top: 0, right: 0 }}>
    <Circle cx={CARD_WIDTH - 20} cy={30} r={60} fill={color} opacity={0.12} />
    <Circle cx={CARD_WIDTH + 10} cy={80} r={40} fill={color} opacity={0.08} />
    <Circle cx={CARD_WIDTH - 50} cy={CARD_HEIGHT - 20} r={35} fill={color} opacity={0.1} />
    <Circle cx={CARD_WIDTH - 10} cy={CARD_HEIGHT - 50} r={20} fill={color} opacity={0.15} />
    <Circle cx={CARD_WIDTH - 80} cy={20} r={8} fill={color} opacity={0.2} />
    <Circle cx={CARD_WIDTH - 30} cy={CARD_HEIGHT - 10} r={5} fill={color} opacity={0.25} />
  </Svg>
));

const DiamondsPattern = React.memo(({ color }: { color: string }) => (
  <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={{ position: 'absolute', top: 0, right: 0 }}>
    <Polygon points={`${CARD_WIDTH - 15},20 ${CARD_WIDTH + 5},40 ${CARD_WIDTH - 15},60 ${CARD_WIDTH - 35},40`} fill={color} opacity={0.15} />
    <Polygon points={`${CARD_WIDTH - 50},70 ${CARD_WIDTH - 30},90 ${CARD_WIDTH - 50},110 ${CARD_WIDTH - 70},90`} fill={color} opacity={0.1} />
    <Polygon points={`${CARD_WIDTH - 10},${CARD_HEIGHT - 60} ${CARD_WIDTH + 10},${CARD_HEIGHT - 40} ${CARD_WIDTH - 10},${CARD_HEIGHT - 20} ${CARD_WIDTH - 30},${CARD_HEIGHT - 40}`} fill={color} opacity={0.12} />
    <Polygon points={`${CARD_WIDTH - 70},30 ${CARD_WIDTH - 55},45 ${CARD_WIDTH - 70},60 ${CARD_WIDTH - 85},45`} fill={color} opacity={0.08} />
    <Rect x={CARD_WIDTH - 25} y={CARD_HEIGHT - 30} width={12} height={12} rx={2} fill={color} opacity={0.2} transform="rotate(45, 0, 0)" />
  </Svg>
));

const WavesPattern = React.memo(({ color }: { color: string }) => (
  <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={{ position: 'absolute', top: 0, right: 0 }}>
    <Path
      d={`M ${CARD_WIDTH - 80} 0 Q ${CARD_WIDTH - 40} 30, ${CARD_WIDTH} 20 T ${CARD_WIDTH} 60`}
      stroke={color} strokeWidth={2} fill="none" opacity={0.15}
    />
    <Path
      d={`M ${CARD_WIDTH - 60} 40 Q ${CARD_WIDTH - 20} 70, ${CARD_WIDTH + 10} 50 T ${CARD_WIDTH + 10} 90`}
      stroke={color} strokeWidth={1.5} fill="none" opacity={0.12}
    />
    <Circle cx={CARD_WIDTH - 20} cy={30} r={4} fill={color} opacity={0.2} />
    <Circle cx={CARD_WIDTH - 50} cy={70} r={3} fill={color} opacity={0.18} />
    <Circle cx={CARD_WIDTH - 10} cy={CARD_HEIGHT - 40} r={5} fill={color} opacity={0.15} />
  </Svg>
));

const GridPattern = React.memo(({ color }: { color: string }) => {
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < 6; i++) {
    const x = CARD_WIDTH - 90 + i * 20;
    lines.push(<Rect key={`v${i}`} x={x} y={0} width={1} height={CARD_HEIGHT} fill={color} opacity={0.06} />);
  }
  for (let i = 0; i < 5; i++) {
    const y = i * 40;
    lines.push(<Rect key={`h${i}`} x={CARD_WIDTH - 90} y={y} width={90} height={1} fill={color} opacity={0.06} />);
  }
  return (
    <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={{ position: 'absolute', top: 0, right: 0 }}>
      {lines}
      <Circle cx={CARD_WIDTH - 50} cy={40} r={6} fill={color} opacity={0.15} />
      <Circle cx={CARD_WIDTH - 30} cy={80} r={4} fill={color} opacity={0.2} />
      <Circle cx={CARD_WIDTH - 70} cy={120} r={3} fill={color} opacity={0.18} />
    </Svg>
  );
});

const patterns = {
  circles: CirclesPattern,
  diamonds: DiamondsPattern,
  waves: WavesPattern,
  grid: GridPattern,
};

function BannerCarouselInner() {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDraggingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const goToIndex = useCallback((index: number, animated = true) => {
    scrollRef.current?.scrollTo({ x: index * (CARD_WIDTH + 12), animated });
  }, []);

  const startAutoScroll = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      if (isDraggingRef.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % BANNERS.length;
        goToIndex(next, true);
        return next;
      });
    }, AUTO_SCROLL_INTERVAL);
  }, [clearTimer, goToIndex]);

  useEffect(() => {
    startAutoScroll();
    return clearTimer;
  }, [startAutoScroll, clearTimer]);

  const handleScrollBeginDrag = useCallback(() => {
    isDraggingRef.current = true;
    clearTimer();
  }, [clearTimer]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
    const clamped = Math.min(Math.max(index, 0), BANNERS.length - 1);
    setActiveIndex(clamped);
    isDraggingRef.current = false;
    startAutoScroll();
  }, [startAutoScroll]);

  return (
    <View style={{ marginBottom: 24 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
        style={{ marginHorizontal: -20 }}
      >
        {BANNERS.map((banner) => {
          const PatternComp = patterns[banner.pattern];
          const accentColor = banner.accentColor;
          return (
            <View
              key={banner.id}
              style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                borderRadius: 20,
                overflow: 'hidden',
                backgroundColor: banner.gradient[0],
              }}
            >
              <View style={{ position: 'absolute', inset: 0, backgroundColor: banner.gradient[0] }} />

              <View style={{
                position: 'absolute',
                width: 140, height: 140, borderRadius: 70,
                backgroundColor: accentColor,
                opacity: 0.08,
                bottom: -30, right: -20,
              }} />
              <View style={{
                position: 'absolute',
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: accentColor,
                opacity: 0.06,
                top: -20, right: 60,
              }} />

              <PatternComp color={accentColor} />

              <View style={{
                position: 'absolute', inset: 0,
                padding: 22, justifyContent: 'space-between',
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{
                      fontSize: 22, fontWeight: '800', color: '#FFFFFF',
                      lineHeight: 28, marginBottom: 6,
                    }}>
                      {banner.title}
                    </Text>
                    <Text style={{
                      fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.7)',
                      lineHeight: 17, maxWidth: 200,
                    }}>
                      {banner.subtitle}
                    </Text>
                  </View>
                  <View style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name={banner.icon} size={22} color="#FFFFFF" />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {BANNERS.map((_, i) => (
                      <View
                        key={i}
                        style={{
                          width: activeIndex === i ? 20 : 6,
                          height: 6, borderRadius: 3,
                          backgroundColor: activeIndex === i ? accentColor : 'rgba(255,255,255,0.3)',
                        }}
                      />
                    ))}
                  </View>
                  <Pressable
                    onPress={() => {
                      const route = BANNER_ROUTES[banner.id];
                      if (route) router.push(route as any);
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>Découvrir</Text>
                    <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const BannerCarousel = React.memo(BannerCarouselInner);
