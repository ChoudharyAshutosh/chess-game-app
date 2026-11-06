/**
 * @format
 */

import React from 'react';
import {Text} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {GameOverModal, ScoreBoard} from '../src/components';

const {act} = ReactTestRenderer;

// White took a queen and a pawn; black took one rook.
const CAPTURES = {capturedBlack: ['♛', '♟'], capturedWhite: ['♖']};

const texts = element => {
  let renderer;
  act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  const result = renderer.root.findAllByType(Text).map(t => t.props.children);
  act(() => renderer.unmount());
  return result;
};

test('the scoreboard counts pieces taken instead of adding up piece values', () => {
  const shown = texts(
    <ScoreBoard
      {...CAPTURES}
      currentTurn="white"
      gameMode="PvP"
      gameStatus={{status: 'playing', currentTurn: 'white'}}
    />,
  );
  expect(shown.filter(t => t === 'Taken')).toHaveLength(2);
  expect(shown).not.toContain('Score');
  expect(shown).toEqual(expect.arrayContaining([2, 1]));
  expect(shown).not.toContain(10);
  expect(shown).not.toContain(5);
});

test('the game-over screen counts pieces taken instead of adding up piece values', () => {
  const shown = texts(
    <GameOverModal
      {...CAPTURES}
      visible
      gameStatus={{status: 'resigned', winner: 'white', loser: 'black'}}
      onClose={() => {}}
    />,
  );
  expect(shown.filter(t => t === 'pieces taken')).toHaveLength(2);
  expect(shown).toEqual(expect.arrayContaining([2, 1]));
  expect(shown).not.toContain(10);
  expect(shown).not.toContain(5);
});
