import { FlashList } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { View } from 'react-native';

let AnimatedFlashListCache: any = null;

/**
 * Safely retrieves an animated version of FlashList.
 * Lazily initialized to prevent boot-time crashes in Reanimated 4.
 */
export const getAnimatedFlashList = () => {
    if (!AnimatedFlashListCache) {
        if (Animated && typeof Animated.createAnimatedComponent === 'function' && FlashList) {
            try {
                AnimatedFlashListCache = Animated.createAnimatedComponent(FlashList);
            } catch (e) {
                console.warn('[AnimatedFlashList] Failed to create animated component:', e);
                AnimatedFlashListCache = FlashList;
            }
        } else {
            AnimatedFlashListCache = FlashList || View;
        }
    }
    return AnimatedFlashListCache;
};

export const SafeAnimatedFlashList = (props: any) => {
    const Component = getAnimatedFlashList();
    return <Component {...props} />;
};
