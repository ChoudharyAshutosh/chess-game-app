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
}

// 3D board -> app.
export type BoardEvent =
  | {type: 'ready'}
  | {type: 'unsupported'; reason: string}
  | {type: 'press'; row: number; col: number};
