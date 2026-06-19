import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shimmer } from '@/components/common/Shimmer';
import { BottomTabInset } from '@/constants/theme';

export function DocumentsSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.pad}>
        <View style={s.headerRow}>
          <View>
            <Shimmer width={180} height={24} borderRadius={8} />
            <Shimmer width={140} height={14} borderRadius={8} style={{ marginTop: 6 }} />
          </View>
          <Shimmer width={36} height={36} borderRadius={10} />
        </View>

        <Shimmer width="100%" height={48} borderRadius={12} style={s.mb16} />

        <View style={s.tabsRow}>
          <Shimmer width={70} height={32} borderRadius={16} />
          <Shimmer width={70} height={32} borderRadius={16} />
          <Shimmer width={70} height={32} borderRadius={16} />
        </View>

        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={s.docItem}>
            <Shimmer width={48} height={48} borderRadius={12} />
            <View style={s.docItemText}>
              <Shimmer width="70%" height={14} borderRadius={6} />
              <Shimmer width="40%" height={12} borderRadius={6} style={{ marginTop: 4 }} />
            </View>
            <Shimmer width={20} height={20} borderRadius={10} />
          </View>
        ))}
      </View>
      <View style={{ height: BottomTabInset + 32 }} />
    </View>
  );
}

export function DevicesSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.pad}>
        <View style={s.headerRow}>
          <View>
            <Shimmer width={160} height={24} borderRadius={8} />
            <Shimmer width={120} height={14} borderRadius={8} style={{ marginTop: 6 }} />
          </View>
          <Shimmer width={36} height={36} borderRadius={10} />
        </View>

        <Shimmer width="100%" height={48} borderRadius={12} style={s.mb16} />

        <View style={s.row2}>
          <Shimmer width="48%" height={160} borderRadius={16} />
          <Shimmer width="48%" height={160} borderRadius={16} />
        </View>
        <View style={s.row2}>
          <Shimmer width="48%" height={160} borderRadius={16} />
          <Shimmer width="48%" height={160} borderRadius={16} />
        </View>
      </View>
      <View style={{ height: BottomTabInset + 32 }} />
    </View>
  );
}

export function DeclarationsSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <View style={s.pad}>
        <View style={s.headerRow}>
          <Shimmer width={160} height={24} borderRadius={8} />
          <Shimmer width={36} height={36} borderRadius={10} />
        </View>

        <View style={s.tabsRow}>
          <Shimmer width={60} height={32} borderRadius={16} />
          <Shimmer width={60} height={32} borderRadius={16} />
          <Shimmer width={80} height={32} borderRadius={16} />
          <Shimmer width={70} height={32} borderRadius={16} />
        </View>

        {[1, 2, 3].map((i) => (
          <View key={i} style={s.mb12}>
            <Shimmer width="100%" height={140} borderRadius={18} />
          </View>
        ))}
      </View>
      <View style={{ height: BottomTabInset + 32 }} />
    </View>
  );
}

export function GainsSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.gainsHeader}>
        <View style={s.pad}>
          <View style={s.gainsTopRow}>
            <Shimmer width={100} height={18} borderRadius={6} />
            <Shimmer width={28} height={28} borderRadius={14} />
          </View>
          <Shimmer width={160} height={36} borderRadius={8} style={{ marginTop: 8 }} />
          <Shimmer width={80} height={14} borderRadius={6} style={{ marginTop: 6 }} />
        </View>
      </View>
      <View style={s.pad}>
        <View style={s.statsRow}>
          <Shimmer width="30%" height={50} borderRadius={12} />
          <Shimmer width="30%" height={50} borderRadius={12} />
          <Shimmer width="30%" height={50} borderRadius={12} />
        </View>

        <Shimmer width={120} height={16} borderRadius={8} style={s.mb12} />

        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={s.txItem}>
            <Shimmer width={36} height={36} borderRadius={10} />
            <View style={s.txText}>
              <Shimmer width="60%" height={14} borderRadius={6} />
              <Shimmer width="30%" height={12} borderRadius={6} style={{ marginTop: 4 }} />
            </View>
            <Shimmer width={70} height={14} borderRadius={6} />
          </View>
        ))}
      </View>
      <View style={{ height: BottomTabInset + 32 }} />
    </View>
  );
}

export function ParrainageSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.paraHeader}>
        <View style={s.pad}>
          <View style={s.paraTopRow}>
            <Shimmer width={28} height={28} borderRadius={14} />
            <Shimmer width={120} height={18} borderRadius={6} />
          </View>
        </View>
      </View>
      <View style={s.pad}>
        <View style={s.statsRow}>
          <Shimmer width="30%" height={70} borderRadius={14} />
          <Shimmer width="30%" height={70} borderRadius={14} />
          <Shimmer width="30%" height={70} borderRadius={14} />
        </View>

        <Shimmer width="100%" height={48} borderRadius={12} style={s.mb16} />

        <Shimmer width={120} height={16} borderRadius={8} style={s.mb12} />

        {[1, 2, 3].map((i) => (
          <View key={i} style={s.paraUser}>
            <Shimmer width={40} height={40} borderRadius={20} />
            <View style={s.paraUserText}>
              <Shimmer width="50%" height={14} borderRadius={6} />
              <Shimmer width="30%" height={12} borderRadius={6} style={{ marginTop: 4 }} />
            </View>
            <Shimmer width={60} height={14} borderRadius={6} />
          </View>
        ))}
      </View>
      <View style={{ height: BottomTabInset + 32 }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pad: {
    paddingHorizontal: 20,
  },
  mb16: {
    marginBottom: 16,
  },
  mb12: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  docItemText: {
    flex: 1,
  },
  gainsHeader: {
    backgroundColor: '#1E3A2F',
    paddingBottom: 20,
  },
  gainsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  txText: {
    flex: 1,
  },
  paraHeader: {
    backgroundColor: '#1E3A2F',
    paddingBottom: 16,
  },
  paraTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paraUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  paraUserText: {
    flex: 1,
  },
});
