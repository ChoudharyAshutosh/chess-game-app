const mockAd = {};
const mockNet = {};
const mockConsent = {};

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({initialize: () => Promise.resolve()}),
  AdEventType: {ERROR: 'error', CLOSED: 'closed'},
  RewardedAdEventType: {LOADED: 'loaded', EARNED_REWARD: 'earned'},
  TestIds: {REWARDED: 'test-rewarded'},
  AdsConsent: {
    gatherConsent: () => Promise.resolve(),
    getConsentInfo: () => Promise.resolve({canRequestAds: mockConsent.canRequestAds}),
  },
  RewardedAd: {createForAdRequest: jest.fn(() => mockAd)},
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: listener => {
      mockNet.listener = listener;
      return mockNet.unsubscribe;
    },
  },
}));

const ONLINE = {isConnected: true, isInternetReachable: true};
const OFFLINE = {isConnected: false, isInternetReachable: false};

let ads;
let listeners;
let appStateListener;
let removeAppState;
let createAd;

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};
const setNetwork = async state => {
  mockNet.listener(state);
  await flush();
};
const emit = type => listeners[type]();
const callbacks = () => ({
  onReward: jest.fn(),
  onCancel: jest.fn(),
  onError: jest.fn(),
});

beforeEach(() => {
  listeners = {};
  mockConsent.canRequestAds = true;
  mockNet.unsubscribe = jest.fn();
  removeAppState = jest.fn();
  mockAd.addAdEventListener = (type, fn) => {
    listeners[type] = fn;
  };
  mockAd.load = jest.fn();
  mockAd.show = jest.fn(() => Promise.resolve());
  jest.isolateModules(() => {
    jest.spyOn(require('react-native').AppState, 'addEventListener').mockImplementation(
      (_type, listener) => {
        appStateListener = listener;
        return {remove: removeAppState};
      },
    );
    createAd = require('react-native-google-mobile-ads').RewardedAd.createForAdRequest;
    ads = jest.requireActual('../src/lib/ads');
  });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('showing an ad', () => {
  beforeEach(async () => {
    ads.initAds();
    await setNetwork(ONLINE);
  });

  test('is unavailable until an ad has loaded', () => {
    expect(ads.showRewardedAd(callbacks())).toBe('unavailable');
    expect(mockAd.show).not.toHaveBeenCalled();
  });

  test('rewards after the ad closes, once earned', () => {
    emit('loaded');
    const cb = callbacks();
    expect(ads.showRewardedAd(cb)).toBe('started');
    emit('earned');
    expect(cb.onReward).not.toHaveBeenCalled();
    mockAd.load.mockClear();
    emit('closed');
    expect(cb.onReward).toHaveBeenCalledTimes(1);
    expect(cb.onCancel).not.toHaveBeenCalled();
    expect(mockAd.load).toHaveBeenCalledTimes(1);
  });

  test('an ad closed early cancels instead of rewarding', () => {
    emit('loaded');
    const cb = callbacks();
    ads.showRewardedAd(cb);
    emit('closed');
    expect(cb.onReward).not.toHaveBeenCalled();
    expect(cb.onCancel).toHaveBeenCalledTimes(1);
  });

  test('a double tap shows only one ad', () => {
    emit('loaded');
    ads.showRewardedAd(callbacks());
    expect(ads.showRewardedAd(callbacks())).toBe('started');
    expect(mockAd.show).toHaveBeenCalledTimes(1);
  });

  test('an error while the ad is playing is reported', () => {
    emit('loaded');
    const cb = callbacks();
    ads.showRewardedAd(cb);
    emit('error');
    expect(cb.onError).toHaveBeenCalledTimes(1);
    expect(cb.onReward).not.toHaveBeenCalled();
  });

  test('a failed show call is reported', async () => {
    emit('loaded');
    mockAd.show.mockImplementation(() => Promise.reject(new Error('failed')));
    const cb = callbacks();
    ads.showRewardedAd(cb);
    await flush();
    expect(cb.onError).toHaveBeenCalledTimes(1);
  });

  test('a load error with no ad playing reports nothing', () => {
    const cb = callbacks();
    ads.showRewardedAd(cb);
    emit('error');
    expect(cb.onError).not.toHaveBeenCalled();
  });
});

describe('internet changes', () => {
  test('starting offline sets nothing up and reports offline', async () => {
    ads.initAds();
    await setNetwork(OFFLINE);
    expect(createAd).not.toHaveBeenCalled();
    expect(ads.showRewardedAd(callbacks())).toBe('offline');
  });

  test('sets ads up when the internet returns', async () => {
    ads.initAds();
    await setNetwork(OFFLINE);
    await setNetwork(ONLINE);
    expect(createAd).toHaveBeenCalledTimes(1);
    expect(mockAd.load).toHaveBeenCalledTimes(1);
    emit('loaded');
    expect(ads.showRewardedAd(callbacks())).toBe('started');
  });

  test('reloads an ad when the internet returns after a failed load', async () => {
    ads.initAds();
    await setNetwork(ONLINE);
    await setNetwork(OFFLINE);
    emit('error');
    mockAd.load.mockClear();
    await setNetwork(ONLINE);
    expect(mockAd.load).toHaveBeenCalledTimes(1);
    expect(createAd).toHaveBeenCalledTimes(1);
  });

  test('a loaded ad can still play offline', async () => {
    ads.initAds();
    await setNetwork(ONLINE);
    emit('loaded');
    await setNetwork(OFFLINE);
    expect(ads.showRewardedAd(callbacks())).toBe('started');
  });

  test('unknown reachability counts as online', async () => {
    ads.initAds();
    await setNetwork({isConnected: true, isInternetReachable: null});
    expect(createAd).toHaveBeenCalledTimes(1);
  });

  test('connected without internet access counts as offline', async () => {
    ads.initAds();
    await setNetwork({isConnected: true, isInternetReachable: false});
    expect(createAd).not.toHaveBeenCalled();
    expect(ads.showRewardedAd(callbacks())).toBe('offline');
  });

  test('retries setup when consent was not available', async () => {
    mockConsent.canRequestAds = false;
    ads.initAds();
    await setNetwork(ONLINE);
    expect(createAd).not.toHaveBeenCalled();

    mockConsent.canRequestAds = true;
    appStateListener('active');
    await flush();
    expect(createAd).toHaveBeenCalledTimes(1);
  });

  test('repeated events during setup create only one ad', async () => {
    ads.initAds();
    mockNet.listener(ONLINE);
    mockNet.listener(ONLINE);
    await flush();
    expect(createAd).toHaveBeenCalledTimes(1);
  });

  test('stopping removes both listeners', () => {
    const stop = ads.initAds();
    stop();
    expect(mockNet.unsubscribe).toHaveBeenCalledTimes(1);
    expect(removeAppState).toHaveBeenCalledTimes(1);
  });
});
