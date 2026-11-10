import {AppState, Platform} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import mobileAds, {
  AdEventType,
  AdsConsent,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// Release builds need the real ad unit IDs from AdMob (the ones containing "/").
const REWARDED_ID: string = __DEV__
  ? TestIds.REWARDED
  : Platform.select({
      ios: 'REPLACE_WITH_IOS_REWARDED_AD_UNIT_ID',
      android: 'ca-app-pub-7674334739423619/9994869426',
      default: '',
    });

export type ShowAdResult = 'started' | 'offline' | 'unavailable';

export interface RewardedAdCallbacks {
  onReward: () => void; // The ad closed after the player earned the reward.
  onCancel: () => void; // The player closed the ad early.
  onError: () => void; // The ad could not be played.
}

let rewarded: RewardedAd | null = null;
let isOnline = true;
let settingUp = false;
let loaded = false;
let showing = false;
let earned = false;
let callbacks: RewardedAdCallbacks | null = null;

const finishShowing = (): void => {
  showing = false;
  earned = false;
  callbacks = null;
  loaded = false;
};

const createRewardedAd = (): void => {
  const ad = RewardedAd.createForAdRequest(REWARDED_ID);
  rewarded = ad;
  ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    loaded = true;
  });
  ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
    earned = true;
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    const onError = callbacks?.onError;
    finishShowing();
    onError?.();
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    const onClosed = earned ? callbacks?.onReward : callbacks?.onCancel;
    finishShowing();
    ad.load(); // Get the next ad ready.
    onClosed?.();
  });
  ad.load();
};

// Safe to call repeatedly: finishes whatever setup is missing and loads an ad if
// none is ready. A step that fails offline is retried on the next call.
const prepareAds = async (): Promise<void> => {
  if (!isOnline || settingUp) return;
  if (rewarded) {
    if (!showing) rewarded.load();
    return;
  }

  settingUp = true;
  try {
    try {
      await AdsConsent.gatherConsent();
    } catch (e) {
      console.warn('Ad consent error', e);
    }
    const {canRequestAds} = await AdsConsent.getConsentInfo();
    if (canRequestAds) {
      await mobileAds().initialize();
      createRewardedAd();
    }
  } catch (e) {
    console.warn('Ads failed to start', e);
  } finally {
    settingUp = false;
  }
};

// Starts ads and retries when the internet returns or the app is reopened.
// Returns a function that stops listening.
export function initAds(): () => void {
  const netInfoUnsubscribe = NetInfo.addEventListener(state => {
    // isInternetReachable is null while unknown, so only false counts as offline.
    isOnline = !!state.isConnected && state.isInternetReachable !== false;
    prepareAds();
  });
  const appStateSubscription = AppState.addEventListener('change', status => {
    if (status === 'active') prepareAds();
  });
  return () => {
    netInfoUnsubscribe();
    appStateSubscription.remove();
  };
}

// Plays a rewarded ad if one is ready, even offline, since it is already loaded.
export function showRewardedAd(adCallbacks: RewardedAdCallbacks): ShowAdResult {
  if (showing) return 'started'; // Ignore a double tap while the ad is opening.
  const ad = rewarded;
  if (!ad || !loaded) {
    if (!isOnline) return 'offline';
    prepareAds();
    return 'unavailable';
  }
  showing = true;
  earned = false;
  callbacks = adCallbacks;
  ad.show().catch(() => {
    const onError = callbacks?.onError;
    finishShowing();
    ad.load();
    onError?.();
  });
  return 'started';
}
