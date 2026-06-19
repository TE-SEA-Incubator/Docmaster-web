import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shimmer } from '@/components/common/Shimmer';
import { BottomTabInset } from '@/constants/theme';

const BANNER_WIDTH = 280;
const BANNER_HEIGHT = 180;
const CARD_HEIGHT = 100;
const STAT_CARD_WIDTH = 160;
const CARD_BORDER = 16;

export function HomeSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Shimmer width={40} height={40} borderRadius={20} />
            <Shimmer width={120} height={16} borderRadius={8} />
          </View>
          <View style={styles.headerRight}>
            <Shimmer width={36} height={36} borderRadius={18} />
            <Shimmer width={36} height={36} borderRadius={18} />
          </View>
        </View>

        <Shimmer width="100%" height={BANNER_HEIGHT} borderRadius={CARD_BORDER} style={styles.banner} />

        <View style={styles.row}>
          <Shimmer width="48%" height={CARD_HEIGHT} borderRadius={CARD_BORDER} />
          <Shimmer width="48%" height={CARD_HEIGHT} borderRadius={CARD_BORDER} />
        </View>

        <View style={styles.row}>
          <Shimmer width="48%" height={90} borderRadius={CARD_BORDER} />
          <Shimmer width="48%" height={90} borderRadius={CARD_BORDER} />
        </View>

        <Shimmer width="100%" height={76} borderRadius={18} style={styles.gainsCard} />

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Shimmer width={16} height={16} borderRadius={8} />
            <Shimmer width={120} height={15} borderRadius={8} />
          </View>
          <Shimmer width="100%" height={80} borderRadius={CARD_BORDER} style={styles.listItem} />
          <Shimmer width="100%" height={80} borderRadius={CARD_BORDER} style={styles.listItem} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleLeft}>
              <Shimmer width={16} height={16} borderRadius={8} />
              <Shimmer width={120} height={15} borderRadius={8} />
            </View>
            <Shimmer width={60} height={15} borderRadius={8} />
          </View>
          <View style={styles.docScroll}>
            <Shimmer width={148} height={130} borderRadius={CARD_BORDER} />
            <Shimmer width={148} height={130} borderRadius={CARD_BORDER} />
            <Shimmer width={148} height={130} borderRadius={CARD_BORDER} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Shimmer width={16} height={16} borderRadius={8} />
            <Shimmer width={120} height={15} borderRadius={8} />
          </View>
          <View style={styles.activityList}>
            <Shimmer width="100%" height={64} borderRadius={CARD_BORDER} style={styles.activityItem} />
            <Shimmer width="100%" height={64} borderRadius={CARD_BORDER} style={styles.activityItem} />
            <Shimmer width="100%" height={64} borderRadius={CARD_BORDER} style={styles.activityItem} />
          </View>
        </View>

        <Shimmer width="100%" height={200} borderRadius={20} style={styles.planCard} />
      </View>

      <View style={{ height: BottomTabInset + 32 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  banner: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  gainsCard: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  listItem: {
    marginBottom: 12,
  },
  docScroll: {
    flexDirection: 'row',
    gap: 12,
  },
  activityList: {
    gap: 1,
  },
  activityItem: {
    marginBottom: 0,
  },
  planCard: {
    marginBottom: 24,
  },
});
