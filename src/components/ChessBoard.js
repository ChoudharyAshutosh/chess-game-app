import React from 'react';
import {View, StyleSheet, Dimensions, Text} from 'react-native';
import Square from './Square';
import {getPieceType, getPieceColor} from '../utils/chessUtils';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
const BOARD_SIZE = Math.min(screenWidth - 16, screenHeight * 0.5);

const ChessBoard = ({
  board,
  selectedSquare,
  validMoves,
  onSquarePress,
  movingPiece,
  gameStatus,
}) => {
  const isInCheck = gameStatus.status === 'check' || gameStatus.status === 'checkmate';
  const currentTurnColor = gameStatus.currentTurn;
  
  return (
    <View style={styles.boardFrame}>
      <View style={styles.boardCorner}>
        <View style={styles.cornerInner} />
      </View>
      <View style={styles.board}>
        <View style={styles.boardInner}>
          {board.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((piece, colIndex) => {
                const isSelected =
                  selectedSquare &&
                  selectedSquare.row === rowIndex &&
                  selectedSquare.col === colIndex;

                const isValidMove = validMoves.some(
                  m => m.row === rowIndex && m.col === colIndex,
                );
                
                const isMoving = movingPiece && 
                  movingPiece.toRow === rowIndex && 
                  movingPiece.toCol === colIndex;

                const isSource = movingPiece &&
                  movingPiece.fromRow === rowIndex &&
                  movingPiece.fromCol === colIndex;

                const pieceType = getPieceType(piece);
                const isKingInCheck = isInCheck && pieceType === 'king' && currentTurnColor === getPieceColor(piece);

                return (
                  <Square
                    key={`${rowIndex}-${colIndex}`}
                    row={rowIndex}
                    col={colIndex}
                    piece={piece}
                    isSelected={isSelected}
                    isValidMove={isValidMove}
                    onPress={onSquarePress}
                    isMovingPiece={isMoving}
                    isSourcePiece={isSource}
                    isKingInCheck={isKingInCheck}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.boardCorner, styles.boardCornerRight]}>
        <View style={styles.cornerInner} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  boardFrame: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boardCorner: {
    width: 8,
    height: BOARD_SIZE,
    backgroundColor: '#8B4513',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardCornerRight: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  cornerInner: {
    width: 4,
    height: BOARD_SIZE - 16,
    backgroundColor: '#A0522D',
    borderRadius: 2,
  },
  board: {
    backgroundColor: '#8B4513',
    padding: 6,
    borderRadius: 0,
  },
  boardInner: {
    flex: 1,
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#654321',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
});

export default ChessBoard;
