/**
 * @format
 */

import React from 'react';
import {ScrollView, Text} from 'react-native';
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

test('every taken piece is shown in one swipeable row', () => {
  let renderer;
  const taken = ['♟', '♞', '♟', '♟', '♛', '♟', '♟'];
  act(() => {
    renderer = ReactTestRenderer.create(
      <ScoreBoard
        capturedBlack={taken}
        capturedWhite={[]}
        currentTurn="white"
        gameMode="PvP"
        gameStatus={{status: 'playing', currentTurn: 'white'}}
      />,
    );
  });
  const row = renderer.root.findByType(ScrollView);
  expect(row.props.horizontal).toBe(true);
  expect(row.findAllByType(Text).map(t => t.props.children)).toEqual(taken);
  act(() => renderer.unmount());
});

test('arrows show which side of the row has more pieces hidden', () => {
  let renderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ScoreBoard
        capturedBlack={['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟', '♞', '♝']}
        capturedWhite={[]}
        currentTurn="white"
        gameMode="PvP"
        gameStatus={{status: 'playing', currentTurn: 'white'}}
      />,
    );
  });
  const row = renderer.root.findByType(ScrollView);
  const arrows = () =>
    renderer.root
      .findAllByType(Text)
      .map(t => t.props.children)
      .filter(c => c === '‹' || c === '›');
  expect(arrows()).toEqual([]);

  // 200 wide, showing 100: scrolled to the newest, older pieces hidden left.
  act(() => row.props.onLayout({nativeEvent: {layout: {width: 100}}}));
  act(() => row.props.onContentSizeChange(200, 24));
  act(() => row.props.onScroll({nativeEvent: {contentOffset: {x: 100}}}));
  expect(arrows()).toEqual(['‹']);

  act(() => row.props.onScroll({nativeEvent: {contentOffset: {x: 50}}}));
  expect(arrows()).toEqual(['‹', '›']);

  act(() => row.props.onScroll({nativeEvent: {contentOffset: {x: 0}}}));
  expect(arrows()).toEqual(['›']);
  act(() => renderer.unmount());
});

test('the panel shows the mode, and the level against the machine', () => {
  const panel = (gameMode, machineLevel) =>
    texts(
      <ScoreBoard
        capturedBlack={[]}
        capturedWhite={[]}
        currentTurn="white"
        gameMode={gameMode}
        machineLevel={machineLevel}
        gameStatus={{status: 'playing', currentTurn: 'white'}}
      />,
    );
  expect(panel('PvM', 'hard')).toEqual(expect.arrayContaining(['Player vs Machine', 'Hard']));
  const pvp = panel('PvP');
  expect(pvp).toContain('Player vs Player');
  expect(pvp).not.toContain('Hard');
});
