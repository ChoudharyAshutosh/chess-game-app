/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {WebView} from 'react-native-webview';
import {Board3D, ChessBoard} from '../src/components';
import {createInitialState} from '../src/utils/chessUtils';

const {act} = ReactTestRenderer;

const BOARD = createInitialState().board;
let renderer;
let onSquarePress;

const props = (overrides = {}) => ({
  board: BOARD,
  selectedSquare: null,
  validMoves: [],
  onSquarePress,
  movingPiece: null,
  gameStatus: {status: 'playing', currentTurn: 'white'},
  ...overrides,
});

const render = (overrides = {}) =>
  act(() => {
    renderer = ReactTestRenderer.create(<Board3D {...props(overrides)} />);
  });
const update = (overrides = {}) =>
  act(() => renderer.update(<Board3D {...props(overrides)} />));

const webView = () => renderer.root.findAllByProps({testID: 'webview'})[0];
const fromBoard = message =>
  act(() => webView().props.onMessage({nativeEvent: {data: JSON.stringify(message)}}));
const sentStates = () =>
  WebView.mockInject.mock.calls.map(([script]) =>
    JSON.parse(script.match(/receive\((.*)\); true;$/)[1]),
  );

beforeEach(() => {
  onSquarePress = jest.fn();
  WebView.mockInject.mockClear();
});

afterEach(() => {
  act(() => renderer.unmount());
  jest.restoreAllMocks();
});

test('shows the 2D board until the 3D board is ready', () => {
  render();
  expect(webView()).toBeTruthy();
  expect(renderer.root.findAllByType(ChessBoard)).toHaveLength(1);
  expect(WebView.mockInject).not.toHaveBeenCalled();

  fromBoard({type: 'ready'});
  expect(renderer.root.findAllByType(ChessBoard)).toHaveLength(0);
  expect(sentStates()).toHaveLength(1);
  expect(sentStates()[0].board).toEqual(BOARD);
});

test('sends the position again if the 3D page reloads', () => {
  render();
  fromBoard({type: 'ready'});
  fromBoard({type: 'ready'});
  expect(sentStates()).toHaveLength(2);
  expect(sentStates()[1].board).toEqual(BOARD);
});

test('taps on the 3D board reach the game', () => {
  render();
  fromBoard({type: 'ready'});
  fromBoard({type: 'press', row: 6, col: 4});
  expect(onSquarePress).toHaveBeenCalledWith(6, 4);
});

test('falls back to the 2D board when 3D is unavailable', () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  render();
  fromBoard({type: 'unsupported', reason: 'no WebGL'});
  expect(webView()).toBeUndefined();
  expect(renderer.root.findAllByType(ChessBoard)).toHaveLength(1);
});

test('falls back to the 2D board when the WebView crashes', () => {
  render();
  fromBoard({type: 'ready'});
  act(() => webView().props.onRenderProcessGone({nativeEvent: {didCrash: true}}));
  expect(webView()).toBeUndefined();
  expect(renderer.root.findAllByType(ChessBoard)).toHaveLength(1);
});

test('sends selection, moves and the move being played, without repeats', () => {
  render();
  fromBoard({type: 'ready'});
  const selection = {
    selectedSquare: {row: 6, col: 4},
    validMoves: [{row: 5, col: 4}, {row: 4, col: 4}],
  };
  update(selection);
  update({...selection, validMoves: [{row: 5, col: 4}, {row: 4, col: 4}]}); // same content
  update({movingPiece: {fromRow: 6, fromCol: 4, toRow: 4, toCol: 4, isCapture: false}});

  const states = sentStates();
  expect(states).toHaveLength(3);
  expect(states[1]).toMatchObject({selected: {row: 6, col: 4}, validMoves: selection.validMoves});
  expect(states[2].moving).toEqual({fromRow: 6, fromCol: 4, toRow: 4, toCol: 4});
});

test('marks the king in check', () => {
  render({gameStatus: {status: 'check', currentTurn: 'black'}});
  fromBoard({type: 'ready'});
  expect(sentStates()[0].checkedKing).toEqual({row: 0, col: 4});
});

test('ignores messages it does not understand', () => {
  render();
  act(() => webView().props.onMessage({nativeEvent: {data: 'not json'}}));
  expect(renderer.root.findAllByType(ChessBoard)).toHaveLength(1);
  expect(onSquarePress).not.toHaveBeenCalled();
});
