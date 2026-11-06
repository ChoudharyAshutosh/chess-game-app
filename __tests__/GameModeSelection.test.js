/**
 * @format
 */

import React from 'react';
import {BackHandler, Text, TouchableOpacity} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import GameModeSelection from '../src/components/GameModeSelection';
import MachineLevelSelection from '../src/components/MachineLevelSelection';

const {act} = ReactTestRenderer;

let renderer;
let onSelectMode;

const levelScreen = () => renderer.root.findAllByType(MachineLevelSelection);
const pressByText = label => {
  const button = renderer.root
    .findAllByType(TouchableOpacity)
    .find(t => t.findAllByType(Text).some(x => x.props.children === label));
  act(() => button.props.onPress());
};

beforeEach(() => {
  jest.useFakeTimers();
  onSelectMode = jest.fn();
  act(() => {
    renderer = ReactTestRenderer.create(<GameModeSelection onSelectMode={onSelectMode} />);
  });
});

afterEach(() => {
  act(() => renderer.unmount());
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('Player vs Player starts straight away', () => {
  pressByText('Player vs Player');
  expect(onSelectMode).toHaveBeenCalledWith('PvP');
  expect(levelScreen()).toHaveLength(0);
});

test('Player vs Machine asks for a level first', () => {
  expect(levelScreen()).toHaveLength(0);
  pressByText('Player vs Machine');
  expect(onSelectMode).not.toHaveBeenCalled();
  expect(levelScreen()).toHaveLength(1);
});

test.each([
  ['Easy', 'easy'],
  ['Medium', 'medium'],
  ['Hard', 'hard'],
])('choosing %s starts the game at that level', (label, level) => {
  pressByText('Player vs Machine');
  pressByText(label);
  expect(onSelectMode).toHaveBeenCalledWith('PvM', level);
});

test('Back returns to the mode list', () => {
  pressByText('Player vs Machine');
  pressByText('Back');
  expect(levelScreen()).toHaveLength(0);
  expect(onSelectMode).not.toHaveBeenCalled();
});

test('the Android back button leaves the level list', () => {
  const remove = jest.fn();
  const listen = jest
    .spyOn(BackHandler, 'addEventListener')
    .mockReturnValue({remove});
  pressByText('Player vs Machine');
  expect(listen).toHaveBeenCalledTimes(1);
  let handled;
  act(() => {
    handled = listen.mock.calls[0][1]();
  });
  expect(handled).toBe(true);
  expect(levelScreen()).toHaveLength(0);
  expect(remove).toHaveBeenCalledTimes(1);
});
