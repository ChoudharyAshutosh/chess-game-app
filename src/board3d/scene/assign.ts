// Works out how the 3D pieces get from one position to the next, so that moves,
// castling, captures, promotion, undo and restart all animate the same way.

export interface PlacedPiece {
  id: number;
  symbol: string;
  row: number;
  col: number;
}

export interface Assignment {
  moves: {id: number; row: number; col: number}[]; // Includes pieces that stay put.
  removed: number[];
  added: {symbol: string; row: number; col: number}[];
}

export function assignPieces(current: PlacedPiece[], board: string[][]): Assignment {
  const targets: {symbol: string; row: number; col: number}[] = [];
  board.forEach((cells, row) =>
    cells.forEach((symbol, col) => {
      if (symbol) targets.push({symbol, row, col});
    }),
  );

  // Every same-symbol pair, closest first, so each piece takes the nearest free
  // matching square. A piece already on its square has distance 0 and stays.
  const pairs: {piece: number; target: number; distance: number}[] = [];
  current.forEach((piece, p) =>
    targets.forEach((target, t) => {
      if (piece.symbol === target.symbol) {
        const distance = Math.hypot(piece.row - target.row, piece.col - target.col);
        pairs.push({piece: p, target: t, distance});
      }
    }),
  );
  pairs.sort((a, b) => a.distance - b.distance);

  const pieceUsed = new Set<number>();
  const targetUsed = new Set<number>();
  const moves: Assignment['moves'] = [];
  for (const {piece, target} of pairs) {
    if (pieceUsed.has(piece) || targetUsed.has(target)) continue;
    pieceUsed.add(piece);
    targetUsed.add(target);
    moves.push({id: current[piece].id, row: targets[target].row, col: targets[target].col});
  }

  return {
    moves,
    removed: current.filter((_, p) => !pieceUsed.has(p)).map(piece => piece.id),
    added: targets.filter((_, t) => !targetUsed.has(t)),
  };
}
