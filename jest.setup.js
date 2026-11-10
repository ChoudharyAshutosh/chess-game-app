/* eslint-env jest */

// Native modules that cannot run under Node.
// The WebView never reports 'ready' unless a test sends it, so the app shows
// its 2D board, which most tests drive directly.
jest.mock('react-native-webview', () => {
  const React = require('react');
  const {View} = require('react-native');
  const mockInject = jest.fn();
  const WebView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({injectJavaScript: mockInject}));
    return React.createElement(View, {testID: 'webview', ...props, source: undefined});
  });
  WebView.mockInject = mockInject;
  return {__esModule: true, default: WebView, WebView};
});

jest.mock('./src/lib/ads', () => ({
  initAds: () => () => {},
  showRewardedAd: jest.fn(),
}));

jest.mock('react-native-sound', () => {
  function Sound(_file, _bundle, callback) {
    if (callback) callback(null);
  }
  Sound.prototype.play = jest.fn(cb => cb && cb(true));
  Sound.prototype.stop = jest.fn(cb => cb && cb());
  Sound.prototype.release = jest.fn();
  Sound.prototype.setVolume = jest.fn();
  Sound.prototype.setCurrentTime = jest.fn();
  Sound.setCategory = jest.fn();
  Sound.MAIN_BUNDLE = '';
  return Sound;
});

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@react-native-vector-icons/material-icons/static', () => ({
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('@react-native-vector-icons/material-design-icons/static', () => ({
  MaterialDesignIcons: 'MaterialDesignIcons',
}));
