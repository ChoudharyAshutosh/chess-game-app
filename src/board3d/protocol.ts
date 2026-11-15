// Messages between the app and the 3D board running inside the WebView.

export interface BoardSquare {
  row: number;
  col: number;
}

export interface BoardMoveHint {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
}

// App -> 3D board: everything needed to draw the current position.
export interface BoardState {
  board: string[][]; // Piece symbols such as '♙', or '' for an empty square.
  selected: BoardSquare | null;
  validMoves: BoardSquare[];
  checkedKing: BoardSquare | null;
  moving: BoardMoveHint | null; // A move that is about to be played.
  // A suggested move for the player, drawn as an arrow until the position changes.
  hint: {from: BoardSquare; to: BoardSquare} | null;
}

// A move found by a hint search, as plain data.
export interface HintMove {
  from: BoardSquare;
  to: BoardSquare;
  piece: string;
  captured: string | null;
  promotion: string | null;
}

// 3D board -> app.
export type BoardEvent =
  | {type: 'ready'}
  | {type: 'unsupported'; reason: string}
  | {type: 'press'; row: number; col: number}
  // The best move found so far by hint search `id`, after each finished depth.
  | {type: 'hint'; id: number; move: HintMove | null; depth: number};
