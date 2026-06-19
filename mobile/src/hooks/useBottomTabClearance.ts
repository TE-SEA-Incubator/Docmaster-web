import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabInset, TabBarClearance } from '@/constants/theme';

/**
 * Returns the bottom padding needed so content never sits underneath:
 *  - the system navigation bar / home indicator (insets.bottom, may be 0 on
 *    devices without a software nav bar)
 *  - the floating tab bar height (TabBarClearance)
 *
 * Use this on every scroll container that lives above the bottom tab bar so
 * the phone's nav bar is always respected, regardless of the device.
 */
export function useBottomTabClearance(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + TabBarClearance;
}

/**
 * The minimum top padding for the tab bar (floating button + status padding).
 * Pair with useSafeAreaInsets().bottom for the full clearance.
 */
export { BottomTabInset, TabBarClearance };
