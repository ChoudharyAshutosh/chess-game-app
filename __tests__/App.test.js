/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import {
  ChessBoard,
  GameModeSelection,
  GameOverModal,
  PromotionModal,
  GameControls,
  NoticeModal,
  ScoreBoard,
} from '../src/components';
import ThinkingIndicator from '../src/components/ThinkingIndicator';
import * as chessUtils from '../src/utils/chessUtils';
import {showRewardedAd} from '../src/lib/ads';

const {algebraicToSquare} = chessUtils;
const {act} = ReactTestRenderer;

let renderer;

beforeEach(() => {
  jest.useFakeTimers();
  showRewardedAd.mockReset();
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

const controls = () => renderer.root.findByType(GameControls).props;
const notice = () => renderer.root.findByType(NoticeModal).props.notice;
// Does what pressing a modal button does once its closing animation finishes.
const pressNotice = label => {
  const action = (notice().actions ?? [{label: 'OK'}]).find(a => a.label === label);
  act(() => {
    renderer.root.findByType(NoticeModal).props.onClose();
    action.onPress?.();
  });
};
const scoreBoard = () => renderer.root.findByType(ScoreBoard).props;
const watchAdAndUndo = () => {
  showRewardedAd.mockImplementation(({onReward}) => {
    onReward();
    return 'started';
  });
  act(() => controls().onUndo());
};

describe('undo', () => {
  test('is unavailable before any move', async () => {
    await start('PvP');
    expect(controls().canUndo).toBe(false);
    act(() => controls().onUndo());
    expect(showRewardedAd).not.toHaveBeenCalled();
  });

  test('PvP takes back one move and restores the turn', async () => {
    await start('PvP');
    move('e2e4');
    move('e7e5');
    watchAdAndUndo();
    expect(at('e7')).toBe('♟');
    expect(at('e5')).toBe('');
    expect(at('e4')).toBe('♙');
    expect(gameStatus().currentTurn).toBe('black');
  });

  test('PvP restores a captured piece', async () => {
    await start('PvP');
    move('e2e4');
    move('d7d5');
    move('e4d5');
    expect(scoreBoard().capturedBlack).toEqual(['♟']);
    watchAdAndUndo();
    expect(scoreBoard().capturedBlack).toEqual([]);
    expect(at('d5')).toBe('♟');
    expect(at('e4')).toBe('♙');
  });

  test('PvM takes back the machine reply and the player move', async () => {
    await start('PvM');
    move('e2e4');
    expect(controls().canUndo).toBe(false);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(gameStatus().currentTurn).toBe('white');
    expect(controls().canUndo).toBe(true);

    watchAdAndUndo();
    expect(at('e2')).toBe('♙');
    expect(at('e4')).toBe('');
    expect(board().flat().filter(Boolean)).toHaveLength(32);
    expect(gameStatus().currentTurn).toBe('white');
    expect(controls().canUndo).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(at('e2')).toBe('♙');
  });

  test('nothing is undone until the reward is earned', async () => {
    await start('PvP');
    move('e2e4');
    showRewardedAd.mockReturnValue('started');
    act(() => controls().onUndo());
    expect(at('e4')).toBe('♙');
  });

  test('closing the ad early shows a message and keeps the move', async () => {
    await start('PvP');
    move('e2e4');
    showRewardedAd.mockImplementation(({onCancel}) => {
      onCancel();
      return 'started';
    });
    act(() => controls().onUndo());
    expect(notice()).toMatchObject({title: 'Ad cancelled', icon: 'cancel'});
    expect(notice().message).toContain('cannot be undone');
    expect(at('e4')).toBe('♙');
    expect(gameStatus().currentTurn).toBe('black');
  });

  test('shows a message when no ad is available', async () => {
    await start('PvP');
    move('e2e4');
    showRewardedAd.mockReturnValue('unavailable');
    act(() => controls().onUndo());
    expect(notice().title).toBe('No ad available');
    expect(at('e4')).toBe('♙');
  });

  test('tells an offline player to connect and keeps the move', async () => {
    await start('PvP');
    move('e2e4');
    showRewardedAd.mockReturnValue('offline');
    act(() => controls().onUndo());
    expect(notice().title).toBe('No internet');
    expect(notice().message).toContain('connect to the internet');
    expect(at('e4')).toBe('♙');
  });

  test('tells the player when the ad fails to play and keeps the move', async () => {
    await start('PvP');
    move('e2e4');
    showRewardedAd.mockImplementation(({onError}) => {
      onError();
      return 'started';
    });
    act(() => controls().onUndo());
    expect(notice().message).toContain('could not be played');
    expect(at('e4')).toBe('♙');

    act(() => renderer.root.findByType(NoticeModal).props.onClose());
    expect(notice()).toBeNull();
  });

  test('restart clears the undo history', async () => {
    await start('PvP');
    move('e2e4');
    act(() => controls().onReset());
    expect(controls().canUndo).toBe(false);
  });
});

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
    act(() => renderer.root.findByType(GameControls).props.onResign());
    expect(notice().title).toBe('Resign');
    expect(gameStatus().status).toBe('playing');
    pressNotice('Resign');
    expect(gameStatus()).toMatchObject({status: 'resigned', winner: 'black', loser: 'white'});
  });

  test('cancelling resign continues the game', async () => {
    await start('PvP');
    act(() => renderer.root.findByType(GameControls).props.onResign());
    pressNotice('Cancel');
    expect(notice()).toBeNull();
    expect(gameStatus().status).toBe('playing');
  });

  test('accepted draw offer ends the game', async () => {
    await start('PvP');
    act(() => renderer.root.findByType(GameControls).props.onOfferDraw());
    expect(notice().message).toBe('White offers a draw. Black, do you accept?');
    pressNotice('Accept');
    expect(gameStatus()).toMatchObject({status: 'draw', reason: 'agreement'});
  });

  test('declined draw offer continues the game', async () => {
    await start('PvP');
    act(() => renderer.root.findByType(GameControls).props.onOfferDraw());
    pressNotice('Decline');
    expect(notice()).toBeNull();
    expect(gameStatus().status).toBe('playing');
  });
});

describe('player vs machine', () => {
  test('shows the thinking animation only during the machine turn', async () => {
    await start('PvM');
    expect(scoreBoard().isThinking).toBe(false);
    expect(renderer.root.findAllByType(ThinkingIndicator)).toHaveLength(0);

    move('e2e4');
    expect(scoreBoard().isThinking).toBe(true);
    expect(renderer.root.findAllByType(ThinkingIndicator)).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(gameStatus().currentTurn).toBe('white');
    expect(renderer.root.findAllByType(ThinkingIndicator)).toHaveLength(0);
  });

  test('stops the thinking animation when the player resigns', async () => {
    await start('PvM');
    move('e2e4');
    act(() => controls().onResign());
    pressNotice('Resign');
    expect(renderer.root.findAllByType(ThinkingIndicator)).toHaveLength(0);
  });

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
    act(() => renderer.root.findByType(GameControls).props.onOfferDraw());
    expect(notice().message).toBe('The machine declines your draw offer.');
    expect(gameStatus().status).toBe('playing');
  });

  test('accepted draw shows the game-over screen after its message is closed', async () => {
    await start('PvM');
    jest.spyOn(chessUtils, 'shouldAcceptDraw').mockReturnValue(true);
    act(() => renderer.root.findByType(GameControls).props.onOfferDraw());
    expect(notice().message).toBe('The machine accepts your draw offer.');
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(renderer.root.findByType(GameOverModal).props.visible).toBe(false);
    pressNotice('OK');
    expect(renderer.root.findByType(GameOverModal).props.visible).toBe(true);
  });

  test('machine waits while the resign question is open', async () => {
    await start('PvM');
    move('e2e4');
    act(() => renderer.root.findByType(GameControls).props.onResign());
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(gameStatus().currentTurn).toBe('black');

    pressNotice('Cancel');
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(gameStatus().currentTurn).toBe('white');
  });

  test('resign cannot be opened while a piece is moving', async () => {
    await start('PvM');
    tap('e2');
    tap('e4');
    act(() => renderer.root.findByType(GameControls).props.onResign());
    expect(notice()).toBeNull();
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
