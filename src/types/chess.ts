export type Color = 'white' | 'black';
export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
export type GameMode = 'PvP' | 'PvM';
export type MachineLevel = 'easy' | 'medium' | 'hard';

// A piece symbol such as '♙', or '' for an empty square.
export type Piece = string;
export type Board = Piece[][];

export interface SquarePosition {
  row: number;
  col: number;
}

export interface CastlingRights {
  whiteKingSide: boolean;
  whiteQueenSide: boolean;
  blackKingSide: boolean;
  blackQueenSide: boolean;
}

export interface GameState {
  board: Board;
  turn: Color;
  castling: CastlingRights;
  enPassant: SquarePosition | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  positionCounts: Record<string, number>;
}

export interface Move {
  from: SquarePosition;
  to: SquarePosition;
  piece: Piece;
  captured: Piece;
  isEnPassant: boolean;
  castle: 'king' | 'queen' | null;
  promotion: Piece | null;
  isDoublePush: boolean;
}

export type GameStatusName =
  | 'playing'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'draw'
  | 'resigned';

export interface GameStatus {
  status: GameStatusName;
  currentTurn: Color;
  winner?: Color;
  loser?: Color;
  reason?: string;
}
