/**
 * @format
 */

import React from 'react';
import {Animated, StyleSheet} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import Square from '../src/components/Square';

const {act} = ReactTestRenderer;

const element = props => (
  <Square row={6} col={4} piece="♙" onPress={() => {}} {...props} />
);

const pieceTransform = renderer => {
  // The square's touchable is also an Animated.View; find the piece's own view.
  const view = renderer.root
    .findAllByType(Animated.View)
    .find(v => Array.isArray(StyleSheet.flatten(v.props.style).transform));
  const [{scale}, {translateY}] = StyleSheet.flatten(view.props.style).transform;
  return {scale, translateY};
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

// A piece that left mid-animation used to keep its half-finished scale and
// offset when it came back through undo, restart or a cancelled promotion.
test('a piece returning to a square is drawn at normal size and position', () => {
  let renderer;
  act(() => {
    renderer = ReactTestRenderer.create(element());
  });

  act(() => renderer.update(element({isSourcePiece: true})));
  // Native animations don't run under Jest, so set the size a piece is left
  // with when it is removed 200ms into its 240ms animation.
  pieceTransform(renderer).scale.stopAnimation();
  pieceTransform(renderer).scale.setValue(1.14);
  act(() => renderer.update(element({piece: ''})));
  act(() => renderer.update(element()));

  const after = pieceTransform(renderer);
  expect(after.scale.__getValue()).toBe(1);
  expect(after.translateY.__getValue()).toBe(0);
  act(() => renderer.unmount());
});
