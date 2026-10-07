/**
 * @format
 */

import React from 'react';
import {Alert} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import {
  ChessBoard,
  GameModeSelection,
  GameOverModal,
  PromotionModal,
  GameControls,
} from '../src/components';
import {algebraicToSquare} from '../src/utils/chessUtils';

const {act} = ReactTestRenderer;

let renderer;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  if (renderer) {
    act(() => renderer.unmount());
    renderer = null;
  }
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const start = async mode => {
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  act(() => {
    renderer.root.findByType(GameModeSelection).props.onSelectMode(mode);
  });
};

const board = () => renderer.root.findByType(ChessBoard).props.board;
const gameStatus = () => renderer.root.findByType(ChessBoard).props.gameStatus;
const at = name => {
  const {row, col} = algebraicToSquare(name);
  return board()[row][col];
};

const tap = name => {
  const {row, col} = algebraicToSquare(name);
  act(() => {
    renderer.root.findByType(ChessBoard).props.onSquarePress(row, col);
  });
};

// Taps from-square then to-square and waits for the move animation.
const move = uci => {
  tap(uci.slice(0, 2));
  tap(uci.slice(2, 4));
  act(() => {
    jest.advanceTimersByTime(300);
  });
};

test('renders the menu', async () => {
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  expect(renderer.root.findByType(GameModeSelection)).toBeTruthy();
});

describe('player vs player', () => {
  test('ordinary moves alternate turns', async () => {
    await start('PvP');
    move('e2e4');
    expect(at('e4')).toBe('♙');
    expect(at('e2')).toBe('');
    // White cannot move twice.
    move('d2d4');
    expect(at('d4')).toBe('');
    move('e7e5');
    expect(at('e5')).toBe('♟');
  });

  test('castling through the UI moves both king and rook', async () => {
    await start('PvP');
    ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6'].forEach(move);
    move('e1g1');
    expect(at('g1')).toBe('♔');
    expect(at('f1')).toBe('♖');
    expect(at('h1')).toBe('');
  });

  test('en passant through the UI removes the captured pawn', async () => {
    await start('PvP');
    ['e2e4', 'a7a6', 'e4e5', 'd7d5'].forEach(move);
    move('e5d6');
    expect(at('d6')).toBe('♙');
    expect(at('d5')).toBe('');
  });

  test('promotion lets the player choose a piece', async () => {
    await start('PvP');
    ['h2h4', 'g7g5', 'h4g5', 'h7h6', 'g5h6', 'g8f6', 'h6h7', 'h8g8'].forEach(move);
    move('h7g8');
    const modal = renderer.root.findByType(PromotionModal);
    expect(modal.props.visible).toBe(true);
    expect(modal.props.color).toBe('white');
    act(() => modal.props.onSelect('knight'));
    expect(at('g8')).toBe('♘');
    expect(renderer.root.findByType(PromotionModal).props.visible).toBe(false);
  });

  test('cancelling promotion takes the move back', async () => {
    await start('PvP');
    ['h2h4', 'g7g5', 'h4g5', 'h7h6', 'g5h6', 'g8f6', 'h6h7', 'h8g8'].forEach(move);
    move('h7g8');
    act(() => renderer.root.findByType(PromotionModal).props.onCancel());
    expect(at('h7')).toBe('♙');
    expect(at('g8')).toBe('♜');
  });

  test('checkmate ends the game', async () => {
    await start('PvP');
    ['f2f3', 'e7e5', 'g2g4', 'd8h4'].forEach(move);
    expect(gameStatus()).toMatchObject({status: 'checkmate', winner: 'black'});
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(renderer.root.findByType(GameOverModal).props.visible).toBe(true);
    // No more moves after the game is over.
    move('a2a3');
    expect(at('a3')).toBe('');
  });

  test('threefold repetition draws the game', async () => {
    await start('PvP');
    ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8'].forEach(move);
    expect(gameStatus()).toMatchObject({status: 'draw', reason: 'threefoldRepetition'});
  });

  test('resigning ends the game', async () => {
    await start('PvP');
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons.find(b => b.text === 'Resign').onPress();
    });
    act(() => renderer.root.findByType(GameControls).props.onResign());
    expect(gameStatus()).toMatchObject({status: 'resigned', winner: 'black', loser: 'white'});
  });

  test('accepted draw offer ends the game', async () => {
    await start('PvP');
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons.find(b => b.text === 'Accept').onPress();
    });
    act(() => renderer.root.findByType(GameControls).props.onOfferDraw());
    expect(gameStatus()).toMatchObject({status: 'draw', reason: 'agreement'});
  });

  test('declined draw offer continues the game', async () => {
    await start('PvP');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    act(() => renderer.root.findByType(GameControls).props.onOfferDraw());
    expect(gameStatus().status).toBe('playing');
  });
});

describe('player vs machine', () => {
  test('machine replies with a legal move', async () => {
    await start('PvM');
    move('e2e4');
    const before = JSON.stringify(board());
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(JSON.stringify(board())).not.toBe(before);
    expect(renderer.root.findByType(ChessBoard).props.gameStatus.currentTurn).toBe('white');
  });

  test('player cannot move black pieces', async () => {
    await start('PvM');
    move('e2e4');
    move('e7e5');
    expect(at('e5')).toBe('');
  });

  test('machine declines a draw in an equal opening position', async () => {
    await start('PvM');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    act(() => renderer.root.findByType(GameControls).props.onOfferDraw());
    expect(alert).toHaveBeenCalledWith('Draw offer', 'The machine declines your draw offer.');
    expect(gameStatus().status).toBe('playing');
  });

  test('restart during machine thinking does not apply a stale move', async () => {
    await start('PvM');
    move('e2e4');
    act(() => renderer.root.findByType(GameControls).props.onReset());
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(at('e4')).toBe('');
    expect(at('e2')).toBe('♙');
    expect(gameStatus().currentTurn).toBe('white');
  });
});
