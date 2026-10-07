import {
  createInitialState,
  fenToState,
  stateToFen,
  perft,
  makeMove,
  getValidMoves,
  getAllLegalMoves,
  getGameStatus,
  isInsufficientMaterial,
  isPromotionMove,
  isGameOver,
  getBestMove,
  shouldAcceptDraw,
  algebraicToSquare as sq,
} from '../src/utils/chessUtils';

// Plays a list of moves like ['e2e4', 'e7e8q'] and returns the final state.
const play = (state, moves) => {
  const promo = {q: 'queen', r: 'rook', b: 'bishop', n: 'knight'};
  return moves.reduce((s, m) => {
    const result = makeMove(s, sq(m.slice(0, 2)), sq(m.slice(2, 4)), promo[m[4]]);
    if (!result) throw new Error(`Illegal move ${m} in ${stateToFen(s)}`);
    return result.state;
  }, state);
};

const targets = (state, from) =>
  getValidMoves(state, sq(from).row, sq(from).col)
    .map(m => `${'abcdefgh'[m.to.col]}${8 - m.to.row}`)
    .sort();

describe('perft (move generation against published reference counts)', () => {
  const cases = [
    ['start position', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [20, 400, 8902, 197281]],
    ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
    ['position 3 (en passant pins)', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
    ['position 4 (promotions, castling)', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
    ['position 4 mirrored', 'r2q1rk1/pP1p2pp/Q4n2/bbp1p3/Np6/1B3NBn/pPPP1PPP/R3K2R b KQ - 0 1', [6, 264, 9467]],
    ['position 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
    ['position 6', 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', [46, 2079, 89890]],
  ];

  test.each(cases)('%s', (_name, fen, expected) => {
    const state = fenToState(fen);
    expected.forEach((nodes, i) => {
      expect(perft(state, i + 1)).toBe(nodes);
    });
  });
});

describe('FEN round trip', () => {
  test('start position', () => {
    expect(stateToFen(createInitialState())).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    );
  });

  test('after 1. e4 sets en passant square and clocks', () => {
    expect(stateToFen(play(createInitialState(), ['e2e4']))).toBe(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    );
  });
});

describe('castling', () => {
  const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';

  test('both sides available when path is clear and safe', () => {
    expect(targets(fenToState(fen), 'e1')).toEqual(
      expect.arrayContaining(['c1', 'g1']),
    );
  });

  test('king-side castling moves the rook to f1', () => {
    const s = play(fenToState(fen), ['e1g1']);
    expect(s.board[7][6]).toBe('♔');
    expect(s.board[7][5]).toBe('♖');
    expect(s.board[7][7]).toBe('');
    expect(s.castling.whiteKingSide).toBe(false);
    expect(s.castling.whiteQueenSide).toBe(false);
  });

  test('queen-side castling moves the rook to d8', () => {
    const s = play(fenToState(fen.replace(' w ', ' b ')), ['e8c8']);
    expect(s.board[0][2]).toBe('♚');
    expect(s.board[0][3]).toBe('♜');
    expect(s.board[0][0]).toBe('');
  });

  test('not allowed while in check', () => {
    const s = fenToState('r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1');
    expect(targets(s, 'e1')).not.toContain('g1');
    expect(targets(s, 'e1')).not.toContain('c1');
  });

  test('not allowed through an attacked square', () => {
    const s = fenToState('r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1');
    expect(targets(s, 'e1')).not.toContain('g1');
    expect(targets(s, 'e1')).toContain('c1');
  });

  test('not allowed into check', () => {
    const s = fenToState('r3k2r/8/8/8/8/8/6r1/R3K2R w KQkq - 0 1');
    expect(targets(s, 'e1')).not.toContain('g1');
  });

  test('queen side allowed when only b1 is attacked', () => {
    const s = fenToState('r3k2r/8/8/8/8/8/1r6/R3K2R w KQkq - 0 1');
    expect(targets(s, 'e1')).toContain('c1');
  });

  test('not allowed with a piece in between', () => {
    const s = fenToState('r3k2r/8/8/8/8/8/8/RN2K1NR w KQkq - 0 1');
    expect(targets(s, 'e1')).not.toContain('g1');
    expect(targets(s, 'e1')).not.toContain('c1');
  });

  test('lost permanently after the king moves and returns', () => {
    const s = play(fenToState(fen), ['e1e2', 'e8e7', 'e2e1', 'e7e8']);
    expect(targets(s, 'e1')).not.toContain('g1');
    expect(targets(s, 'e1')).not.toContain('c1');
  });

  test('lost on one side after that rook moves', () => {
    const s = play(fenToState(fen), ['h1h2', 'a8a7', 'h2h1', 'a7a8']);
    expect(targets(s, 'e1')).not.toContain('g1');
    expect(targets(s, 'e1')).toContain('c1');
  });

  test('lost when the rook is captured on its home square', () => {
    const s = play(fenToState('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1'), ['a8a1']);
    expect(s.castling.whiteQueenSide).toBe(false);
    expect(s.castling.blackQueenSide).toBe(false);
  });
});

describe('en passant', () => {
  test('capture available right after the double push and removes the pawn', () => {
    const s1 = play(createInitialState(), ['e2e4', 'a7a6', 'e4e5', 'd7d5']);
    expect(targets(s1, 'e5')).toContain('d6');
    const s2 = play(s1, ['e5d6']);
    expect(s2.board[3][3]).toBe(''); // d5 pawn gone
    expect(s2.board[2][3]).toBe('♙');
  });

  test('only available on the immediately following move', () => {
    const s = play(createInitialState(), ['e2e4', 'a7a6', 'e4e5', 'd7d5', 'h2h3', 'h7h6']);
    expect(targets(s, 'e5')).not.toContain('d6');
  });

  test('not available after a single-step pawn move', () => {
    const s = play(createInitialState(), ['e2e4', 'd7d6', 'e4e5', 'd6d5']);
    expect(targets(s, 'e5')).not.toContain('d6');
  });

  test('illegal when it would expose the king along the rank', () => {
    const s = fenToState('8/8/8/K2pP2r/8/8/8/7k w - d6 0 1');
    expect(targets(s, 'e5')).not.toContain('d6');
  });
});

describe('promotion', () => {
  const fen = '8/P6k/8/8/8/8/8/K7 w - - 0 1';

  test.each([
    ['queen', '♕'],
    ['rook', '♖'],
    ['bishop', '♗'],
    ['knight', '♘'],
  ])('promote to %s', (type, piece) => {
    const result = makeMove(fenToState(fen), sq('a7'), sq('a8'), type);
    expect(result.state.board[0][0]).toBe(piece);
  });

  test('detected as a promotion move', () => {
    expect(isPromotionMove(fenToState(fen), sq('a7'), sq('a8'))).toBe(true);
    expect(isPromotionMove(fenToState(fen), sq('a1'), sq('a2'))).toBe(false);
  });

  test('capture-promotion for black', () => {
    const s = play(fenToState('7k/8/8/8/8/8/1p6/R6K b - - 0 1'), ['b2a1n']);
    expect(s.board[7][0]).toBe('♞');
  });
});

describe('legality', () => {
  test('pinned piece cannot leave the pin line', () => {
    const s = fenToState('4r2k/8/8/8/8/8/4B3/4K3 w - - 0 1');
    expect(targets(s, 'e2')).toEqual([]);
  });

  test('king cannot move next to the enemy king', () => {
    const s = fenToState('8/8/8/3k4/8/3K4/8/8 w - - 0 1');
    const t = targets(s, 'd3');
    expect(t).not.toContain('d4');
    expect(t).not.toContain('c4');
    expect(t).not.toContain('e4');
  });

  test('only the side to move has moves', () => {
    expect(targets(createInitialState(), 'e7')).toEqual([]);
  });

  test('illegal move is rejected', () => {
    expect(makeMove(createInitialState(), sq('e2'), sq('e5'))).toBeNull();
  });
});

describe('game status', () => {
  test('checkmate (fool\'s mate)', () => {
    const s = play(createInitialState(), ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
    expect(getGameStatus(s)).toMatchObject({status: 'checkmate', winner: 'black'});
  });

  test('check', () => {
    const s = play(createInitialState(), ['e2e4', 'f7f6', 'd1h5']);
    expect(getGameStatus(s).status).toBe('check');
  });

  test('stalemate', () => {
    const s = fenToState('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(getGameStatus(s)).toMatchObject({status: 'stalemate'});
  });

  test.each([
    ['K v K', '8/8/8/4k3/8/8/8/4K3 w - - 0 1', true],
    ['K+B v K', '8/8/8/4k3/8/8/8/2B1K3 w - - 0 1', true],
    ['K+N v K', '8/8/8/4k3/8/8/8/1N2K3 w - - 0 1', true],
    ['K+B v K+B same colour', '8/8/8/4k3/8/4b3/8/2B1K3 w - - 0 1', true],
    ['K+B v K+B opposite colour', '8/8/8/4k3/8/5b2/8/2B1K3 w - - 0 1', false],
    ['K+N v K+N', '8/8/8/4k3/8/4n3/8/1N2K3 w - - 0 1', false],
    ['K+N+N v K', '8/8/8/4k3/8/8/8/1N2KN2 w - - 0 1', false],
    ['K+P v K', '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1', false],
    ['K+R v K', '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', false],
  ])('insufficient material: %s -> %s', (_name, fen, expected) => {
    const s = fenToState(fen);
    expect(isInsufficientMaterial(s.board)).toBe(expected);
    if (expected) {
      expect(getGameStatus(s)).toMatchObject({status: 'draw', reason: 'insufficientMaterial'});
    }
  });

  test('capturing the last piece leaves a drawn K v K', () => {
    const s = play(fenToState('k7/8/8/8/4q3/4K3/8/8 w - - 0 1'), ['e3e4']);
    expect(getGameStatus(s)).toMatchObject({status: 'draw', reason: 'insufficientMaterial'});
  });

  test('threefold repetition', () => {
    const shuffle = ['g1f3', 'g8f6', 'f3g1', 'f6g8'];
    const twice = play(createInitialState(), shuffle);
    expect(getGameStatus(twice).status).toBe('playing');
    const thrice = play(twice, shuffle);
    expect(getGameStatus(thrice)).toMatchObject({status: 'draw', reason: 'threefoldRepetition'});
  });

  test('repetition ignores an en passant square that cannot be captured', () => {
    const s = createInitialState();
    const after = play(s, ['e2e4', 'e7e5', 'g1f3', 'g8f6', 'f3g1', 'f6g8']);
    // Position after 1.e4 e5 and the knight shuffle repeats without e.p. rights.
    expect(Object.values(after.positionCounts).some(n => n === 2)).toBe(true);
  });

  test('fifty-move rule', () => {
    const s = fenToState('8/8/8/4k3/8/8/4R3/4K3 w - - 99 80');
    expect(getGameStatus(s).status).toBe('playing');
    const after = play(s, ['e2a2']);
    expect(after.halfmoveClock).toBe(100);
    expect(getGameStatus(after)).toMatchObject({status: 'draw', reason: 'fiftyMove'});
  });

  test('checkmate takes precedence over the fifty-move rule', () => {
    const s = fenToState('7k/8/6K1/8/8/8/8/R7 w - - 99 80');
    const after = play(s, ['a1a8']);
    expect(getGameStatus(after)).toMatchObject({status: 'checkmate', winner: 'white'});
  });

  test('pawn moves and captures reset the fifty-move clock', () => {
    const s = fenToState('4k3/8/8/8/8/8/4P3/4K3 w - - 40 30');
    expect(play(s, ['e2e3']).halfmoveClock).toBe(0);
  });

  test('isGameOver', () => {
    expect(isGameOver('checkmate')).toBe(true);
    expect(isGameOver('draw')).toBe(true);
    expect(isGameOver('resigned')).toBe(true);
    expect(isGameOver('check')).toBe(false);
  });
});

describe('computer player', () => {
  test('finds mate in one', () => {
    const s = fenToState('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    const move = getBestMove(s, 3);
    expect(move.to).toEqual(sq('a8'));
  });

  test('escapes check and always returns a move when one exists (old null bug)', () => {
    // Black is in check but completely winning.
    const s = fenToState('6k1/8/8/2q5/1q6/8/8/K5R1 b - - 0 1');
    const move = getBestMove(s, 3);
    expect(move).not.toBeNull();
    expect(makeMove(s, move.from, move.to)).not.toBeNull();
  });

  test('promotes a pawn', () => {
    const s = fenToState('8/8/8/8/8/7K/p7/7k b - - 0 1');
    const move = getBestMove(s, 3);
    expect(move.from).toEqual(sq('a2'));
    expect(move.promotion).toBe('♛');
  });

  test('takes a free queen', () => {
    const s = fenToState('4k3/8/8/3q4/4P3/8/8/4K3 w - - 0 1');
    expect(getBestMove(s, 3).to).toEqual(sq('d5'));
  });

  test('returns null only when there are no legal moves', () => {
    const s = fenToState('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(getAllLegalMoves(s)).toHaveLength(0);
    expect(getBestMove(s)).toBeNull();
  });

  test('plays complete self-play games without illegal moves', () => {
    for (let game = 0; game < 2; game++) {
      let s = createInitialState();
      for (let ply = 0; ply < 60; ply++) {
        if (isGameOver(getGameStatus(s).status)) break;
        const move = getBestMove(s, 2);
        const result = makeMove(
          s,
          move.from,
          move.to,
          move.promotion ? 'queen' : undefined,
        );
        expect(result).not.toBeNull();
        s = result.state;
      }
    }
  });

  test('accepts a draw only when worse', () => {
    const blackLosing = fenToState('4k3/8/8/8/8/8/8/QQ2K3 w - - 0 1');
    expect(shouldAcceptDraw(blackLosing, 'black')).toBe(true);
    const blackWinning = fenToState('qq2k3/8/8/8/8/8/8/4K3 w - - 0 1');
    expect(shouldAcceptDraw(blackWinning, 'black')).toBe(false);
  });
});
