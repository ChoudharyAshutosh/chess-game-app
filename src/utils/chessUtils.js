// Chess rules engine.
//
// Board: 8x8 array of unicode piece strings ('' = empty). Row 0 is rank 8
// (black's back rank), row 7 is rank 1 (white's back rank), col 0 is the a-file.
//
// Game state:
//   {
//     board,
//     turn: 'white' | 'black',
//     castling: {whiteKingSide, whiteQueenSide, blackKingSide, blackQueenSide},
//     enPassant: {row, col} | null   // square a pawn may capture onto en passant
//     halfmoveClock,                  // plies since last capture or pawn move
//     fullmoveNumber,
//     positionCounts: {[positionKey]: number},
//   }
//
// Move:
//   {from: {row, col}, to: {row, col}, piece, captured, isEnPassant,
//    castle: 'king' | 'queen' | null, promotion: piece | null, isDoublePush}

export const PIECES = {
  WHITE_KING: '♔',
  WHITE_QUEEN: '♕',
  WHITE_ROOK: '♖',
  WHITE_BISHOP: '♗',
  WHITE_KNIGHT: '♘',
  WHITE_PAWN: '♙',
  BLACK_KING: '♚',
  BLACK_QUEEN: '♛',
  BLACK_ROOK: '♜',
  BLACK_BISHOP: '♝',
  BLACK_KNIGHT: '♞',
  BLACK_PAWN: '♟',
};

const PIECE_BY_COLOR = {
  white: {king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙'},
  black: {king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟'},
};

export const getPiece = (color, type) => PIECE_BY_COLOR[color][type];

export const PROMOTION_TYPES = ['queen', 'rook', 'bishop', 'knight'];

// Material values shown to players (captured-piece score).
export const PIECE_VALUES = {
  '♙': 1,
  '♟': 1,
  '♘': 3,
  '♞': 3,
  '♗': 3,
  '♝': 3,
  '♖': 5,
  '♜': 5,
  '♕': 9,
  '♛': 9,
  '♔': 0,
  '♚': 0,
};

export const INITIAL_BOARD = [
  ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
  ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
  ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'],
];

export const isWhitePiece = piece => piece !== '' && '♔♕♖♗♘♙'.includes(piece);

export const isBlackPiece = piece => piece !== '' && '♚♛♜♝♞♟'.includes(piece);

export const isPiece = piece => piece !== '';

export const getPieceColor = piece => {
  if (isWhitePiece(piece)) return 'white';
  if (isBlackPiece(piece)) return 'black';
  return null;
};

const PIECE_TYPES = {
  '♙': 'pawn', '♟': 'pawn',
  '♘': 'knight', '♞': 'knight',
  '♗': 'bishop', '♝': 'bishop',
  '♖': 'rook', '♜': 'rook',
  '♕': 'queen', '♛': 'queen',
  '♔': 'king', '♚': 'king',
};

export const getPieceType = piece => PIECE_TYPES[piece] || null;

export const opponentOf = color => (color === 'white' ? 'black' : 'white');

export const isValidPosition = (row, col) => {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
};

const KNIGHT_OFFSETS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];
const ORTHOGONAL = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAGONAL = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

const BACK_RANK = {white: 7, black: 0};

// ---------------------------------------------------------------------------
// State creation / FEN
// ---------------------------------------------------------------------------

const FULL_CASTLING = () => ({
  whiteKingSide: true,
  whiteQueenSide: true,
  blackKingSide: true,
  blackQueenSide: true,
});

export const createInitialState = () => {
  const state = {
    board: INITIAL_BOARD.map(row => [...row]),
    turn: 'white',
    castling: FULL_CASTLING(),
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    positionCounts: {},
  };
  state.positionCounts[getPositionKey(state)] = 1;
  return state;
};

const FEN_TO_PIECE = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};
const PIECE_TO_FEN = Object.fromEntries(
  Object.entries(FEN_TO_PIECE).map(([fen, piece]) => [piece, fen]),
);

export const squareToAlgebraic = ({row, col}) =>
  `${'abcdefgh'[col]}${8 - row}`;

export const algebraicToSquare = name => ({
  row: 8 - Number(name[1]),
  col: 'abcdefgh'.indexOf(name[0]),
});

export const fenToState = fen => {
  const [placement, turn, castling, enPassant, halfmove, fullmove] = fen
    .trim()
    .split(/\s+/);
  const board = placement.split('/').map(rank => {
    const row = [];
    for (const ch of rank) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) row.push('');
      } else {
        row.push(FEN_TO_PIECE[ch]);
      }
    }
    return row;
  });
  const rights = castling || '-';
  const state = {
    board,
    turn: turn === 'b' ? 'black' : 'white',
    castling: {
      whiteKingSide: rights.includes('K'),
      whiteQueenSide: rights.includes('Q'),
      blackKingSide: rights.includes('k'),
      blackQueenSide: rights.includes('q'),
    },
    enPassant:
      enPassant && enPassant !== '-' ? algebraicToSquare(enPassant) : null,
    halfmoveClock: Number(halfmove) || 0,
    fullmoveNumber: Number(fullmove) || 1,
    positionCounts: {},
  };
  state.positionCounts[getPositionKey(state)] = 1;
  return state;
};

export const stateToFen = state => {
  const placement = state.board
    .map(row => {
      let out = '';
      let empty = 0;
      for (const piece of row) {
        if (!piece) {
          empty++;
        } else {
          if (empty) out += empty;
          empty = 0;
          out += PIECE_TO_FEN[piece];
        }
      }
      return empty ? out + empty : out;
    })
    .join('/');
  const {whiteKingSide, whiteQueenSide, blackKingSide, blackQueenSide} =
    state.castling;
  const rights =
    (whiteKingSide ? 'K' : '') +
      (whiteQueenSide ? 'Q' : '') +
      (blackKingSide ? 'k' : '') +
      (blackQueenSide ? 'q' : '') || '-';
  const ep = state.enPassant ? squareToAlgebraic(state.enPassant) : '-';
  return `${placement} ${state.turn === 'white' ? 'w' : 'b'} ${rights} ${ep} ${
    state.halfmoveClock
  } ${state.fullmoveNumber}`;
};

// ---------------------------------------------------------------------------
// Attack detection
// ---------------------------------------------------------------------------

export const findKing = (board, color) => {
  const king = getPiece(color, 'king');
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === king) return {row: r, col: c};
    }
  }
  return null;
};

// True if any piece of `byColor` attacks (row, col).
export const isSquareAttacked = (board, row, col, byColor) => {
  const pieces = PIECE_BY_COLOR[byColor];

  // Pawns attack diagonally forward, so look one row "behind" the square.
  const pawnRow = byColor === 'white' ? row + 1 : row - 1;
  if (pawnRow >= 0 && pawnRow < 8) {
    if (col > 0 && board[pawnRow][col - 1] === pieces.pawn) return true;
    if (col < 7 && board[pawnRow][col + 1] === pieces.pawn) return true;
  }

  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const r = row + dr;
    const c = col + dc;
    if (isValidPosition(r, c) && board[r][c] === pieces.knight) return true;
  }

  for (const [dr, dc] of KING_OFFSETS) {
    const r = row + dr;
    const c = col + dc;
    if (isValidPosition(r, c) && board[r][c] === pieces.king) return true;
  }

  for (const [dr, dc] of ORTHOGONAL) {
    let r = row + dr;
    let c = col + dc;
    while (isValidPosition(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p === pieces.rook || p === pieces.queen) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  for (const [dr, dc] of DIAGONAL) {
    let r = row + dr;
    let c = col + dc;
    while (isValidPosition(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p === pieces.bishop || p === pieces.queen) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
};

export const isKingInCheck = (board, color) => {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king.row, king.col, opponentOf(color));
};

// ---------------------------------------------------------------------------
// Move generation
// ---------------------------------------------------------------------------

const makeMoveObject = (board, fromRow, fromCol, toRow, toCol, extra = {}) => ({
  from: {row: fromRow, col: fromCol},
  to: {row: toRow, col: toCol},
  piece: board[fromRow][fromCol],
  captured: board[toRow][toCol],
  isEnPassant: false,
  castle: null,
  promotion: null,
  isDoublePush: false,
  ...extra,
});

// Moves that obey piece movement but may leave the mover's king in check.
// Castling is fully validated here (it depends on attacked squares).
const generatePseudoMoves = (state, row, col, moves) => {
  const {board} = state;
  const piece = board[row][col];
  if (!piece) return;
  const color = getPieceColor(piece);
  const type = getPieceType(piece);
  const enemy = opponentOf(color);

  const addStep = (r, c) => {
    if (!isValidPosition(r, c)) return;
    const target = board[r][c];
    if (!target || getPieceColor(target) === enemy) {
      moves.push(makeMoveObject(board, row, col, r, c));
    }
  };

  const addSliding = directions => {
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (isValidPosition(r, c)) {
        const target = board[r][c];
        if (!target) {
          moves.push(makeMoveObject(board, row, col, r, c));
        } else {
          if (getPieceColor(target) === enemy) {
            moves.push(makeMoveObject(board, row, col, r, c));
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
  };

  switch (type) {
    case 'pawn': {
      const dir = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 6 : 1;
      const promotionRow = color === 'white' ? 0 : 7;

      const addPawnMove = (r, c, extra = {}) => {
        if (r === promotionRow) {
          for (const promoType of PROMOTION_TYPES) {
            moves.push(
              makeMoveObject(board, row, col, r, c, {
                ...extra,
                promotion: getPiece(color, promoType),
              }),
            );
          }
        } else {
          moves.push(makeMoveObject(board, row, col, r, c, extra));
        }
      };

      const oneStep = row + dir;
      if (isValidPosition(oneStep, col) && !board[oneStep][col]) {
        addPawnMove(oneStep, col);
        const twoStep = row + 2 * dir;
        if (row === startRow && !board[twoStep][col]) {
          addPawnMove(twoStep, col, {isDoublePush: true});
        }
      }

      for (const dc of [-1, 1]) {
        const r = oneStep;
        const c = col + dc;
        if (!isValidPosition(r, c)) continue;
        const target = board[r][c];
        if (target && getPieceColor(target) === enemy) {
          addPawnMove(r, c);
        } else if (
          !target &&
          state.enPassant &&
          state.enPassant.row === r &&
          state.enPassant.col === c
        ) {
          // The captured pawn sits beside us, not on the target square.
          const capturedPawn = board[row][c];
          if (capturedPawn === getPiece(enemy, 'pawn')) {
            moves.push(
              makeMoveObject(board, row, col, r, c, {
                captured: capturedPawn,
                isEnPassant: true,
              }),
            );
          }
        }
      }
      break;
    }

    case 'knight':
      for (const [dr, dc] of KNIGHT_OFFSETS) addStep(row + dr, col + dc);
      break;

    case 'bishop':
      addSliding(DIAGONAL);
      break;

    case 'rook':
      addSliding(ORTHOGONAL);
      break;

    case 'queen':
      addSliding([...ORTHOGONAL, ...DIAGONAL]);
      break;

    case 'king': {
      for (const [dr, dc] of KING_OFFSETS) addStep(row + dr, col + dc);

      // Castling: king and rook unmoved (tracked by rights), squares between
      // empty, king not in check, and king does not pass through or land on
      // an attacked square.
      const homeRow = BACK_RANK[color];
      if (row !== homeRow || col !== 4) break;
      const rook = getPiece(color, 'rook');
      const rights = state.castling;
      const kingSide =
        color === 'white' ? rights.whiteKingSide : rights.blackKingSide;
      const queenSide =
        color === 'white' ? rights.whiteQueenSide : rights.blackQueenSide;
      if (!kingSide && !queenSide) break;
      if (isSquareAttacked(board, row, col, enemy)) break;

      if (
        kingSide &&
        board[homeRow][7] === rook &&
        !board[homeRow][5] &&
        !board[homeRow][6] &&
        !isSquareAttacked(board, homeRow, 5, enemy) &&
        !isSquareAttacked(board, homeRow, 6, enemy)
      ) {
        moves.push(makeMoveObject(board, row, col, homeRow, 6, {castle: 'king'}));
      }
      if (
        queenSide &&
        board[homeRow][0] === rook &&
        !board[homeRow][1] &&
        !board[homeRow][2] &&
        !board[homeRow][3] &&
        !isSquareAttacked(board, homeRow, 3, enemy) &&
        !isSquareAttacked(board, homeRow, 2, enemy)
      ) {
        moves.push(makeMoveObject(board, row, col, homeRow, 2, {castle: 'queen'}));
      }
      break;
    }
  }
};

// Applies a move to a board copy, handling en passant, castling and promotion.
export const applyMoveToBoard = (board, move) => {
  const newBoard = board.map(row => [...row]);
  const {from, to} = move;
  const piece = newBoard[from.row][from.col];

  newBoard[to.row][to.col] = move.promotion || piece;
  newBoard[from.row][from.col] = '';

  if (move.isEnPassant) {
    newBoard[from.row][to.col] = '';
  }

  if (move.castle === 'king') {
    newBoard[to.row][5] = newBoard[to.row][7];
    newBoard[to.row][7] = '';
  } else if (move.castle === 'queen') {
    newBoard[to.row][3] = newBoard[to.row][0];
    newBoard[to.row][0] = '';
  }

  return newBoard;
};

const isLegal = (board, move, color) =>
  !isKingInCheck(applyMoveToBoard(board, move), color);

// Legal moves for the piece on (row, col). Only the side to move has moves.
export const getValidMoves = (state, row, col) => {
  const piece = state.board[row][col];
  if (!piece || getPieceColor(piece) !== state.turn) return [];
  const pseudo = [];
  generatePseudoMoves(state, row, col, pseudo);
  return pseudo.filter(move => isLegal(state.board, move, state.turn));
};

export const getAllLegalMoves = state => {
  const moves = [];
  const {board, turn} = state;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && getPieceColor(piece) === turn) {
        const pseudo = [];
        generatePseudoMoves(state, r, c, pseudo);
        for (const move of pseudo) {
          if (isLegal(board, move, turn)) moves.push(move);
        }
      }
    }
  }
  return moves;
};

export const hasLegalMoves = state => {
  const {board, turn} = state;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && getPieceColor(piece) === turn) {
        const pseudo = [];
        generatePseudoMoves(state, r, c, pseudo);
        if (pseudo.some(move => isLegal(board, move, turn))) return true;
      }
    }
  }
  return false;
};

// ---------------------------------------------------------------------------
// Making moves
// ---------------------------------------------------------------------------

const updateCastlingRights = (castling, move) => {
  const next = {...castling};
  const clearSquare = ({row, col}) => {
    if (row === 7 && col === 4) {
      next.whiteKingSide = false;
      next.whiteQueenSide = false;
    } else if (row === 0 && col === 4) {
      next.blackKingSide = false;
      next.blackQueenSide = false;
    } else if (row === 7 && col === 7) {
      next.whiteKingSide = false;
    } else if (row === 7 && col === 0) {
      next.whiteQueenSide = false;
    } else if (row === 0 && col === 7) {
      next.blackKingSide = false;
    } else if (row === 0 && col === 0) {
      next.blackQueenSide = false;
    }
  };
  // Moving from a king/rook home square, or capturing on a rook home square,
  // permanently removes the corresponding right.
  clearSquare(move.from);
  clearSquare(move.to);
  return next;
};

// Next position without history bookkeeping (used by search and perft).
const advancePosition = (state, move) => ({
  board: applyMoveToBoard(state.board, move),
  turn: opponentOf(state.turn),
  castling: updateCastlingRights(state.castling, move),
  enPassant: move.isDoublePush
    ? {row: (move.from.row + move.to.row) / 2, col: move.from.col}
    : null,
  halfmoveClock:
    getPieceType(move.piece) === 'pawn' || move.captured
      ? 0
      : state.halfmoveClock + 1,
  fullmoveNumber: state.fullmoveNumber + (state.turn === 'black' ? 1 : 0),
  positionCounts: state.positionCounts,
});

// Positions are identical for repetition purposes when the same side is to
// move, pieces stand on the same squares, and the same moves are possible
// (castling rights and a *legally capturable* en passant square).
export const getPositionKey = state => {
  const placement = state.board.map(row => row.map(p => p || '.').join('')).join('/');
  const {whiteKingSide, whiteQueenSide, blackKingSide, blackQueenSide} =
    state.castling;
  const rights = `${whiteKingSide ? 'K' : ''}${whiteQueenSide ? 'Q' : ''}${
    blackKingSide ? 'k' : ''
  }${blackQueenSide ? 'q' : ''}`;

  let ep = '-';
  if (state.enPassant) {
    const {row, col} = state.enPassant;
    const pawn = getPiece(state.turn, 'pawn');
    const fromRow = state.turn === 'white' ? row + 1 : row - 1;
    for (const c of [col - 1, col + 1]) {
      if (c < 0 || c > 7 || state.board[fromRow][c] !== pawn) continue;
      const pseudo = [];
      generatePseudoMoves(state, fromRow, c, pseudo);
      if (
        pseudo.some(m => m.isEnPassant && isLegal(state.board, m, state.turn))
      ) {
        ep = squareToAlgebraic(state.enPassant);
        break;
      }
    }
  }
  return `${placement} ${state.turn[0]} ${rights || '-'} ${ep}`;
};

// Plays a move on the game state. `promotionType` ('queen', 'rook', 'bishop',
// 'knight') is used when a pawn reaches the last rank; defaults to queen.
// Returns null if the move is illegal.
export const makeMove = (state, from, to, promotionType = 'queen') => {
  const candidates = getValidMoves(state, from.row, from.col).filter(
    m => m.to.row === to.row && m.to.col === to.col,
  );
  if (candidates.length === 0) return null;

  let move = candidates[0];
  if (move.promotion) {
    const wanted = getPiece(state.turn, promotionType);
    move = candidates.find(m => m.promotion === wanted);
    if (!move) return null;
  }

  const next = advancePosition(state, move);
  const key = getPositionKey(next);
  next.positionCounts = {
    ...state.positionCounts,
    [key]: (state.positionCounts[key] || 0) + 1,
  };
  return {state: next, move};
};

export const isPromotionMove = (state, from, to) =>
  getValidMoves(state, from.row, from.col).some(
    m => m.to.row === to.row && m.to.col === to.col && m.promotion,
  );

// ---------------------------------------------------------------------------
// Game status
// ---------------------------------------------------------------------------

// Dead positions where no sequence of legal moves can produce checkmate:
// K v K, K+minor v K, and any number of bishops all on one square colour.
export const isInsufficientMaterial = board => {
  const minors = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const type = getPieceType(board[r][c]);
      if (!type || type === 'king') continue;
      if (type === 'pawn' || type === 'rook' || type === 'queen') return false;
      minors.push({type, squareColor: (r + c) % 2});
    }
  }
  if (minors.length <= 1) return true;
  return (
    minors.every(m => m.type === 'bishop') &&
    minors.every(m => m.squareColor === minors[0].squareColor)
  );
};

export const GAME_OVER_STATUSES = ['checkmate', 'stalemate', 'draw', 'resigned'];

export const isGameOver = status => GAME_OVER_STATUSES.includes(status);

export const DRAW_REASON_TEXT = {
  stalemate: 'Stalemate',
  insufficientMaterial: 'Insufficient material',
  fiftyMove: 'Fifty-move rule',
  threefoldRepetition: 'Threefold repetition',
  agreement: 'Mutual agreement',
};

// Status of the game for the side to move. Draws by repetition and the
// fifty-move rule are applied automatically (as most chess apps do).
export const getGameStatus = state => {
  const {board, turn} = state;
  const opponent = opponentOf(turn);
  const inCheck = isKingInCheck(board, turn);
  const canMove = hasLegalMoves(state);

  // Checkmate takes precedence over every draw rule.
  if (!canMove) {
    if (inCheck) {
      return {status: 'checkmate', winner: opponent, currentTurn: turn};
    }
    return {status: 'stalemate', reason: 'stalemate', currentTurn: turn};
  }
  if (isInsufficientMaterial(board)) {
    return {status: 'draw', reason: 'insufficientMaterial', currentTurn: turn};
  }
  if ((state.positionCounts[getPositionKey(state)] || 0) >= 3) {
    return {status: 'draw', reason: 'threefoldRepetition', currentTurn: turn};
  }
  if (state.halfmoveClock >= 100) {
    return {status: 'draw', reason: 'fiftyMove', currentTurn: turn};
  }
  return {status: inCheck ? 'check' : 'playing', currentTurn: turn};
};

// ---------------------------------------------------------------------------
// Perft (move-generation verification)
// ---------------------------------------------------------------------------

export const perft = (state, depth) => {
  if (depth === 0) return 1;
  const moves = getAllLegalMoves(state);
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const move of moves) {
    nodes += perft(advancePosition(state, move), depth - 1);
  }
  return nodes;
};

// ---------------------------------------------------------------------------
// Computer player
// ---------------------------------------------------------------------------

const SEARCH_VALUES = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 0,
};

const PAWN_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0],
];

const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];

const BISHOP_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
];

const ROOK_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0],
];

const QUEEN_TABLE = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
];

const KING_MIDDLEGAME_TABLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20],
];

// In the endgame the king should come to the centre.
const KING_ENDGAME_TABLE = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50],
];

const POSITION_TABLES = {
  pawn: PAWN_TABLE,
  knight: KNIGHT_TABLE,
  bishop: BISHOP_TABLE,
  rook: ROOK_TABLE,
  queen: QUEEN_TABLE,
};

// Static evaluation in centipawns; positive favours white.
export const evaluateBoard = board => {
  let score = 0;
  let nonPawnMaterial = 0;
  const kings = {};

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const type = getPieceType(piece);
      const color = getPieceColor(piece);
      if (type === 'king') {
        kings[color] = {row: r, col: c};
        continue;
      }
      if (type !== 'pawn') nonPawnMaterial += SEARCH_VALUES[type];
      const tableRow = color === 'white' ? r : 7 - r;
      const value = SEARCH_VALUES[type] + POSITION_TABLES[type][tableRow][c];
      score += color === 'white' ? value : -value;
    }
  }

  const kingTable =
    nonPawnMaterial <= 1300 ? KING_ENDGAME_TABLE : KING_MIDDLEGAME_TABLE;
  if (kings.white) score += kingTable[kings.white.row][kings.white.col];
  if (kings.black) score -= kingTable[7 - kings.black.row][kings.black.col];

  return score;
};

const MATE_SCORE = 100000;
const MAX_QUIESCENCE_DEPTH = 6;

const moveOrderScore = move => {
  let score = 0;
  if (move.captured) {
    // Most valuable victim, least valuable attacker.
    score +=
      10 * SEARCH_VALUES[getPieceType(move.captured)] -
      SEARCH_VALUES[getPieceType(move.piece)] +
      10000;
  }
  if (move.promotion) score += SEARCH_VALUES[getPieceType(move.promotion)] + 9000;
  if (move.castle) score += 50;
  return score;
};

const orderMoves = moves =>
  moves.sort((a, b) => moveOrderScore(b) - moveOrderScore(a));

const sideSign = color => (color === 'white' ? 1 : -1);

const quiescence = (state, alpha, beta, qDepth) => {
  const standPat = evaluateBoard(state.board) * sideSign(state.turn);
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;
  if (qDepth >= MAX_QUIESCENCE_DEPTH) return alpha;

  const {board, turn} = state;
  const captures = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && getPieceColor(piece) === turn) {
        const pseudo = [];
        generatePseudoMoves(state, r, c, pseudo);
        for (const move of pseudo) {
          if ((move.captured || move.promotion === getPiece(turn, 'queen')) &&
              isLegal(board, move, turn)) {
            captures.push(move);
          }
        }
      }
    }
  }
  orderMoves(captures);

  for (const move of captures) {
    const score = -quiescence(advancePosition(state, move), -beta, -alpha, qDepth + 1);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
};

// Negamax with alpha-beta; scores are from the side to move's perspective.
const negamax = (state, depth, alpha, beta, ply) => {
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) {
    return isKingInCheck(state.board, state.turn) ? -(MATE_SCORE - ply) : 0;
  }
  if (isInsufficientMaterial(state.board) || state.halfmoveClock >= 100) {
    return 0;
  }
  if (depth <= 0) return quiescence(state, alpha, beta, 0);

  orderMoves(moves);
  let best = -Infinity;
  for (const move of moves) {
    const score = -negamax(advancePosition(state, move), depth - 1, -beta, -alpha, ply + 1);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
};

// Scores every legal root move. A move that repeats a position for the third
// time is scored as a draw.
const scoreRootMoves = (state, depth) => {
  const moves = getAllLegalMoves(state);
  // Shuffle first so equally good moves are picked at random.
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]];
  }
  orderMoves(moves);

  const scored = [];
  let alpha = -Infinity;
  for (const move of moves) {
    const child = advancePosition(state, move);
    const key = getPositionKey(child);
    let score;
    if ((state.positionCounts[key] || 0) + 1 >= 3) {
      score = 0;
    } else {
      // Bounded by the best score so far: moves that cannot beat it are cut
      // off early and return a score no higher than alpha.
      score = -negamax(child, depth - 1, -Infinity, -alpha, 1);
    }
    scored.push({move, score});
    if (score > alpha) alpha = score;
  }
  return scored;
};

// Best move for the side to move. Always returns a move when one exists.
export const getBestMove = (state, depth = 3) => {
  const scored = scoreRootMoves(state, depth);
  if (scored.length === 0) return null;
  let best = scored[0];
  for (const entry of scored) {
    if (entry.score > best.score) best = entry;
  }
  return best.move;
};

// Search score for the side to move, in centipawns.
export const evaluatePosition = (state, depth = 2) => {
  const scored = scoreRootMoves(state, depth);
  if (scored.length === 0) {
    return isKingInCheck(state.board, state.turn) ? -MATE_SCORE : 0;
  }
  return Math.max(...scored.map(s => s.score));
};

// The computer accepts a draw offer when it judges its own position to be
// clearly worse. `color` is the side deciding.
export const shouldAcceptDraw = (state, color) => {
  const score = evaluatePosition(state, 2);
  const scoreForColor = state.turn === color ? score : -score;
  return scoreForColor <= -150;
};
