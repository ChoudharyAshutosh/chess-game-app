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

export const PIECE_NAMES = {
  WHITE_KING: 'K',
  WHITE_QUEEN: 'Q',
  WHITE_ROOK: 'R',
  WHITE_BISHOP: 'B',
  WHITE_KNIGHT: 'N',
  WHITE_PAWN: 'P',
  BLACK_KING: 'K',
  BLACK_QUEEN: 'Q',
  BLACK_ROOK: 'R',
  BLACK_BISHOP: 'B',
  BLACK_KNIGHT: 'N',
  BLACK_PAWN: 'P',
};

export const PIECE_IMAGES = {
  white: {
    king: '👑',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
  black: {
    king: '👑',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
};

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

const KING_TABLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20],
];

const getPositionValue = (piece, row, col, color) => {
  const table = {
    '♙': PAWN_TABLE, '♟': PAWN_TABLE,
    '♘': KNIGHT_TABLE, '♞': KNIGHT_TABLE,
    '♗': BISHOP_TABLE, '♝': BISHOP_TABLE,
    '♖': ROOK_TABLE, '♜': ROOK_TABLE,
    '♕': QUEEN_TABLE, '♛': QUEEN_TABLE,
    '♔': KING_TABLE, '♚': KING_TABLE,
  }[piece];
  
  if (!table) return 0;
  
  const flippedRow = color === 'white' ? row : 7 - row;
  return table[flippedRow][col];
};

export const evaluateBoard = (board) => {
  let score = 0;
  let whiteMaterial = 0;
  let blackMaterial = 0;
  
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      
      const color = getPieceColor(piece);
      const value = PIECE_VALUES[piece] || 0;
      const posValue = getPositionValue(piece, r, c, color);
      
      if (color === 'white') {
        score += value + posValue * 0.1;
        whiteMaterial += value;
      } else {
        score -= value + posValue * 0.1;
        blackMaterial += value;
      }
    }
  }
  
  if (whiteMaterial <= 0) return -10000;
  if (blackMaterial <= 0) return 10000;
  
  return score;
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

export const isWhitePiece = piece => {
  return '♔♕♖♗♘♙'.includes(piece);
};

export const isBlackPiece = piece => {
  return '♚♛♜♝♞♟'.includes(piece);
};

export const isPiece = piece => {
  return piece !== '';
};

export const getPieceColor = piece => {
  if (isWhitePiece(piece)) return 'white';
  if (isBlackPiece(piece)) return 'black';
  return null;
};

export const getPieceType = piece => {
  const pawns = '♙♟';
  const knights = '♘♞';
  const bishops = '♗♝';
  const rooks = '♖♜';
  const queens = '♕♛';
  const kings = '♔♚';
  
  if (pawns.includes(piece)) return 'pawn';
  if (knights.includes(piece)) return 'knight';
  if (bishops.includes(piece)) return 'bishop';
  if (rooks.includes(piece)) return 'rook';
  if (queens.includes(piece)) return 'queen';
  if (kings.includes(piece)) return 'king';
  return null;
};

export const isValidPosition = (row, col) => {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
};

export const getValidMoves = (board, row, col, filterCheck = true) => {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const color = getPieceColor(piece);

  const addMoveIfValid = (newRow, newCol) => {
    if (isValidPosition(newRow, newCol)) {
      const targetPiece = board[newRow][newCol];
      if (!targetPiece || getPieceColor(targetPiece) !== color) {
        moves.push({row: newRow, col: newCol});
        return !!targetPiece;
      }
      return true;
    }
    return true;
  };

  const addSlidingMoves = (directions) => {
    for (const [dr, dc] of directions) {
      let newRow = row + dr;
      let newCol = col + dc;
      while (isValidPosition(newRow, newCol)) {
        const targetPiece = board[newRow][newCol];
        if (!targetPiece) {
          moves.push({row: newRow, col: newCol});
        } else {
          if (getPieceColor(targetPiece) !== color) {
            moves.push({row: newRow, col: newCol});
          }
          break;
        }
        newRow += dr;
        newCol += dc;
      }
    }
  };

  switch (piece) {
    case '♙':
      if (row > 0) {
        if (!board[row - 1][col]) {
          moves.push({row: row - 1, col});
          if (row === 6 && !board[row - 2][col]) {
            moves.push({row: row - 2, col});
          }
        }
        if (col > 0) {
          const target = board[row - 1][col - 1];
          if (target && isBlackPiece(target)) {
            moves.push({row: row - 1, col: col - 1});
          }
        }
        if (col < 7) {
          const target = board[row - 1][col + 1];
          if (target && isBlackPiece(target)) {
            moves.push({row: row - 1, col: col + 1});
          }
        }
      }
      break;

    case '♟':
      if (row < 7) {
        if (!board[row + 1][col]) {
          moves.push({row: row + 1, col});
          if (row === 1 && !board[row + 2][col]) {
            moves.push({row: row + 2, col});
          }
        }
        if (col > 0) {
          const target = board[row + 1][col - 1];
          if (target && isWhitePiece(target)) {
            moves.push({row: row + 1, col: col - 1});
          }
        }
        if (col < 7) {
          const target = board[row + 1][col + 1];
          if (target && isWhitePiece(target)) {
            moves.push({row: row + 1, col: col + 1});
          }
        }
      }
      break;

    case '♘':
    case '♞':
      const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      for (const [dr, dc] of knightMoves) {
        addMoveIfValid(row + dr, col + dc);
      }
      break;

    case '♗':
    case '♝':
      addSlidingMoves([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
      break;

    case '♖':
    case '♜':
      addSlidingMoves([[-1, 0], [1, 0], [0, -1], [0, 1]]);
      break;

    case '♕':
    case '♛':
      addSlidingMoves([
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1],
      ]);
      break;

    case '♔':
    case '♚':
      const kingMoves = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1],
      ];
      for (const [dr, dc] of kingMoves) {
        addMoveIfValid(row + dr, col + dc);
      }
      break;
  }

  if (filterCheck) {
    return moves.filter(move => {
      const result = movePiece(board, row, col, move.row, move.col);
      return !isKingInCheck(result.newBoard, color);
    });
  }

  return moves;
};

export const movePiece = (board, fromRow, fromCol, toRow, toCol) => {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[fromRow][fromCol];
  const capturedPiece = newBoard[toRow][toCol];
  
  newBoard[toRow][toCol] = piece;
  newBoard[fromRow][fromCol] = '';
  
  let isPromotion = false;
  if ((piece === '♙' && toRow === 0) || (piece === '♟' && toRow === 7)) {
    newBoard[toRow][toCol] = piece;
    isPromotion = true;
  }

  return {newBoard, capturedPiece, isPromotion};
};

export const isKingInCheck = (board, color) => {
  let kingRow, kingCol;
  
  const kingPiece = color === 'white' ? '♔' : '♚';
  
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === kingPiece) {
        kingRow = r;
        kingCol = c;
        break;
      }
    }
  }

  if (kingRow === undefined) return false;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && getPieceColor(piece) !== color) {
        const moves = getValidMoves(board, r, c, false);
        if (moves.some(m => m.row === kingRow && m.col === kingCol)) {
          return true;
        }
      }
    }
  }

  return false;
};

export const getGameStatus = (board, currentTurn) => {
  const opponent = currentTurn === 'white' ? 'black' : 'white';
  
  if (isKingInCheck(board, currentTurn)) {
    if (!hasLegalMoves(board, currentTurn)) {
      return {status: 'checkmate', winner: opponent, currentTurn: currentTurn};
    }
    return {status: 'check', currentTurn: currentTurn};
  }
  
  if (!hasLegalMoves(board, currentTurn)) {
    return {status: 'stalemate'};
  }
  
  return {status: 'playing', currentTurn};
};

export const hasLegalMoves = (board, color) => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && getPieceColor(piece) === color) {
        const moves = getValidMoves(board, r, c, false);
        for (const move of moves) {
          const result = movePiece(board, r, c, move.row, move.col);
          if (!isKingInCheck(result.newBoard, color)) {
            return true;
          }
        }
      }
    }
  }
  return false;
};

export const getRandomMove = (board, color) => {
  const allMoves = [];
  
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && getPieceColor(piece) === color) {
        const moves = getValidMoves(board, r, c, false);
        for (const move of moves) {
          const result = movePiece(board, r, c, move.row, move.col);
          if (!isKingInCheck(result.newBoard, color)) {
            allMoves.push({from: {row: r, col: c}, to: move});
          }
        }
      }
    }
  }
  
  if (allMoves.length === 0) return null;
  
  return allMoves[Math.floor(Math.random() * allMoves.length)];
};

export const getBestMove = (board, color, depth = 3) => {
  const isInCheck = isKingInCheck(board, color);
  
  let allMoves = [];
  
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && getPieceColor(piece) === color) {
        const moves = getValidMoves(board, r, c, false);
        for (const move of moves) {
          const result = movePiece(board, r, c, move.row, move.col);
          if (!isKingInCheck(result.newBoard, color)) {
            const isCapture = result.capturedPiece !== '';
            let score = 0;
            try {
              score = minimax(result.newBoard, depth - 1, -Infinity, Infinity, color === 'white' ? 'black' : 'white', false);
            } catch (e) {
              score = 0;
            }
            allMoves.push({from: {row: r, col: c}, to: move, score, isCapture});
          }
        }
      }
    }
  }
  
  if (allMoves.length === 0) return null;
  
  if (isInCheck) {
    const captures = allMoves.filter(m => m.isCapture);
    if (captures.length > 0) {
      return captures[0];
    }
    return allMoves[0];
  }
  
  const captureMoves = allMoves.filter(m => m.isCapture);
  if (captureMoves.length > 0) {
    return captureMoves[0];
  }
  
  return allMoves[0];
};

const minimax = (board, depth, alpha, beta, color, isMaximizing) => {
  if (depth === 0) {
    return evaluateBoard(board);
  }
  
  const allMoves = [];
  
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && getPieceColor(piece) === color) {
        const moves = getValidMoves(board, r, c, false);
        for (const move of moves) {
          const result = movePiece(board, r, c, move.row, move.col);
          if (!isKingInCheck(result.newBoard, color)) {
            allMoves.push({from: {row: r, col: c}, to: move});
          }
        }
      }
    }
  }
  
  if (allMoves.length === 0) {
    if (isKingInCheck(board, color)) {
      return color === 'white' ? -1000 : 1000;
    }
    return 0;
  }
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of allMoves) {
      const result = movePiece(board, move.from.row, move.from.col, move.to.row, move.to.col);
      const evalScore = minimax(result.newBoard, depth - 1, alpha, beta, 'black', false);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of allMoves) {
      const result = movePiece(board, move.from.row, move.from.col, move.to.row, move.to.col);
      const evalScore = minimax(result.newBoard, depth - 1, alpha, beta, 'white', true);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};
