import {assignPieces} from '../src/board3d/scene/assign';

const empty = () => Array.from({length: 8}, () => Array(8).fill(''));
const place = (pieces, extra = []) => {
  const board = empty();
  [...pieces, ...extra].forEach(({symbol, row, col}) => (board[row][col] = symbol));
  return board;
};

test('a piece that moved is moved, not removed and re-added', () => {
  const current = [{id: 1, symbol: '♙', row: 6, col: 4}];
  const result = assignPieces(current, place([{symbol: '♙', row: 4, col: 4}]));
  expect(result).toEqual({moves: [{id: 1, row: 4, col: 4}], removed: [], added: []});
});

test('a capture removes the taken piece', () => {
  const current = [
    {id: 1, symbol: '♙', row: 4, col: 4},
    {id: 2, symbol: '♟', row: 3, col: 3},
  ];
  const result = assignPieces(current, place([{symbol: '♙', row: 3, col: 3}]));
  expect(result.moves).toEqual([{id: 1, row: 3, col: 3}]);
  expect(result.removed).toEqual([2]);
  expect(result.added).toEqual([]);
});

test('castling moves both the king and the rook', () => {
  const current = [
    {id: 1, symbol: '♔', row: 7, col: 4},
    {id: 2, symbol: '♖', row: 7, col: 7},
    {id: 3, symbol: '♖', row: 7, col: 0},
  ];
  const next = place([
    {symbol: '♔', row: 7, col: 6},
    {symbol: '♖', row: 7, col: 5},
    {symbol: '♖', row: 7, col: 0},
  ]);
  const {moves, removed, added} = assignPieces(current, next);
  expect(moves).toEqual(
    expect.arrayContaining([
      {id: 1, row: 7, col: 6},
      {id: 2, row: 7, col: 5},
      {id: 3, row: 7, col: 0},
    ]),
  );
  expect(removed).toEqual([]);
  expect(added).toEqual([]);
});

test('promotion swaps the pawn for a new queen', () => {
  const current = [{id: 1, symbol: '♙', row: 0, col: 0}];
  const result = assignPieces(current, place([{symbol: '♕', row: 0, col: 0}]));
  expect(result.removed).toEqual([1]);
  expect(result.added).toEqual([{symbol: '♕', row: 0, col: 0}]);
});

test('undoing a capture brings the taken piece back', () => {
  const current = [{id: 1, symbol: '♙', row: 3, col: 3}];
  const next = place([
    {symbol: '♙', row: 4, col: 4},
    {symbol: '♟', row: 3, col: 3},
  ]);
  const result = assignPieces(current, next);
  expect(result.moves).toEqual([{id: 1, row: 4, col: 4}]);
  expect(result.added).toEqual([{symbol: '♟', row: 3, col: 3}]);
});

test('pieces that did not move stay where they are', () => {
  const current = [
    {id: 1, symbol: '♙', row: 6, col: 0},
    {id: 2, symbol: '♙', row: 6, col: 1},
  ];
  const result = assignPieces(current, place([
    {symbol: '♙', row: 6, col: 0},
    {symbol: '♙', row: 5, col: 1},
  ]));
  expect(result.moves).toEqual(
    expect.arrayContaining([
      {id: 1, row: 6, col: 0},
      {id: 2, row: 5, col: 1},
    ]),
  );
});
