/**
 * @format
 */

import React from 'react';
import {StyleSheet} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import GameControls from '../src/components/GameControls';

const {act} = ReactTestRenderer;

const PLAYING = {status: 'playing', currentTurn: 'white'};
const props = overrides => ({
  gameStatus: PLAYING,
  onReset: jest.fn(),
  onBack: jest.fn(),
  onResign: jest.fn(),
  onOfferDraw: jest.fn(),
  canOfferDraw: true,
  onUndo: jest.fn(),
  canUndo: false,
  onHint: jest.fn(),
  canHint: true,
  ...overrides,
});

const undoButton = renderer =>
  renderer.root.findAll(
    n =>
      n.props.accessibilityLabel === 'Undo, watch an ad' &&
      typeof n.props.style === 'function',
  )[0];
const opacityOf = button =>
  StyleSheet.flatten(button.props.style({pressed: false})).opacity ?? 1;

test('the undo button looks enabled as soon as undo becomes possible', () => {
  let renderer;
  act(() => {
    renderer = ReactTestRenderer.create(<GameControls {...props()} />);
  });
  expect(undoButton(renderer).props.disabled).toBe(true);
  expect(opacityOf(undoButton(renderer))).toBe(0.4);

  act(() => renderer.update(<GameControls {...props({canUndo: true})} />));
  expect(undoButton(renderer).props.disabled).toBe(false);
  expect(opacityOf(undoButton(renderer))).toBe(1);

  act(() => renderer.update(<GameControls {...props({canUndo: false})} />));
  expect(opacityOf(undoButton(renderer))).toBe(0.4);
  act(() => renderer.unmount());
});
