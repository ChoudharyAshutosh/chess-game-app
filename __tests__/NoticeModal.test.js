/**
 * @format
 */

import React from 'react';
import {Animated, Modal, Text, TouchableOpacity} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import NoticeModal from '../src/components/NoticeModal';

const {act} = ReactTestRenderer;

const NOTICE = {icon: 'wifi-off', title: 'No internet', message: 'Please connect.'};

let renderer;

const render = props => {
  act(() => {
    renderer = ReactTestRenderer.create(<NoticeModal onClose={() => {}} {...props} />);
  });
  return renderer;
};

// Fake timers keep the opening animation's delay from firing after a test ends.
beforeEach(() => jest.useFakeTimers());

afterEach(() => {
  act(() => renderer.unmount());
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('renders nothing without a notice', () => {
  expect(render({notice: null}).toJSON()).toBeNull();
});

test('shows the title and message', () => {
  render({notice: NOTICE});
  const text = renderer.root.findAllByType(Text).map(t => t.props.children);
  expect(text).toEqual(expect.arrayContaining(['No internet', 'Please connect.', 'OK']));
});

describe('closing', () => {
  let finishExit;

  // The first Animated.parallel is the opening animation, the second the exit.
  // Native animations don't run under Jest, so the test finishes the exit.
  beforeEach(() => {
    const parallel = Animated.parallel;
    let calls = 0;
    jest.spyOn(Animated, 'parallel').mockImplementation((...args) => {
      calls += 1;
      if (calls === 1) return parallel(...args);
      return {start: cb => (finishExit = cb)};
    });
  });

  const pressOk = () =>
    act(() => {
      renderer.root
        .findAllByType(TouchableOpacity)
        .find(t => t.props.accessibilityRole === 'button')
        .props.onPress();
    });

  test('OK plays the exit animation before calling onClose', () => {
    const onClose = jest.fn();
    render({notice: NOTICE, onClose});
    pressOk();
    expect(onClose).not.toHaveBeenCalled();
    finishExit({finished: true});
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('a button runs its action only after the modal has closed', () => {
    const calls = [];
    const onPress = () => calls.push('action');
    const notice = {
      ...NOTICE,
      actions: [{label: 'Cancel', variant: 'secondary'}, {label: 'Resign', variant: 'danger', onPress}],
    };
    render({notice, onClose: () => calls.push('close')});
    const buttons = renderer.root
      .findAllByType(TouchableOpacity)
      .filter(t => t.props.accessibilityRole === 'button');
    expect(buttons).toHaveLength(2);
    act(() => buttons[1].props.onPress());
    expect(calls).toEqual([]);
    finishExit({finished: true});
    expect(calls).toEqual(['close', 'action']);
  });

  test('the back button closes without running an action', () => {
    const onPress = jest.fn();
    render({notice: {...NOTICE, actions: [{label: 'Resign', onPress}]}});
    act(() => renderer.root.findByType(Modal).props.onRequestClose());
    finishExit({finished: true});
    expect(onPress).not.toHaveBeenCalled();
  });

  test('a double tap closes only once', () => {
    render({notice: NOTICE});
    pressOk();
    pressOk();
    expect(Animated.parallel).toHaveBeenCalledTimes(2);
  });

  test('the Android back button closes it too', () => {
    const onClose = jest.fn();
    render({notice: NOTICE, onClose});
    act(() => renderer.root.findByType(Modal).props.onRequestClose());
    finishExit({finished: true});
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
