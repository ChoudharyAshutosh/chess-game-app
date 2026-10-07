/* eslint-env jest */

// Native modules that cannot run under Node.
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
