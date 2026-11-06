// Types for the parts of chessUtils.js that TypeScript code imports.
// Add a declaration here before importing another export from a .ts/.tsx file.
import type {
  Board,
  Color,
  GameState,
  GameStatus,
  Move,
  Piece,
  PieceType,
  SquarePosition,
} from '../types/chess';

export const createInitialState: () => GameState;
export const getValidMoves: (state: GameState, row: number, col: number) => Move[];
export const makeMove: (
  state: GameState,
  from: SquarePosition,
  to: SquarePosition,
  promotionType?: PieceType,
) => {state: GameState; move: Move} | null;
export const applyMoveToBoard: (board: Board, move: Move) => Board;
export const getGameStatus: (state: GameState) => GameStatus;
export const getPieceColor: (piece: Piece) => Color | null;
export const getPieceType: (piece: Piece) => PieceType | null;
export const getBestMove: (state: GameState, depth?: number) => Move | null;
export const searchBestMove: (
  state: GameState,
  depth: number,
  onDone: (move: Move | null) => void,
) => () => void;
export const isGameOver: (status: GameStatus['status']) => boolean;
export const opponentOf: (color: Color) => Color;
export const shouldAcceptDraw: (state: GameState, color: Color) => boolean;
