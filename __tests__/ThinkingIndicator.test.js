/**
 * @format
 */

import React from 'react';
import {Animated, Text} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import ThinkingIndicator from '../src/components/ThinkingIndicator';

const {act} = ReactTestRenderer;

afterEach(() => jest.restoreAllMocks());

test('shows the label and three dots', () => {
  let renderer;
  act(() => {
    renderer = ReactTestRenderer.create(<ThinkingIndicator />);
  });
  expect(renderer.root.findByType(Text).props.children).toBe('Thinking');
  expect(renderer.root.findAllByType(Animated.View)).toHaveLength(3);
  act(() => renderer.unmount());
});

test('stops looping when it is removed', () => {
  const stop = jest.fn();
  jest.spyOn(Animated, 'loop').mockReturnValue({start: jest.fn(), stop});
  let renderer;
  act(() => {
    renderer = ReactTestRenderer.create(<ThinkingIndicator />);
  });
  expect(Animated.loop).toHaveBeenCalledTimes(1);
  expect(stop).not.toHaveBeenCalled();
  act(() => renderer.unmount());
  expect(stop).toHaveBeenCalledTimes(1);
});
