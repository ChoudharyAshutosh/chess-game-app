import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {isGameOver as isFinished, DRAW_REASON_TEXT} from '../utils/chessUtils';

const GameInfo = ({
  currentTurn,
  gameStatus,
  gameMode,
}) => {
  const getStatusText = () => {
    switch (gameStatus.status) {
      case 'check':
        return `${gameStatus.currentTurn === 'white' ? 'Black' : 'White'} is in Check!`;
      case 'checkmate':
        return `Checkmate! ${gameStatus.winner === 'white' ? 'White' : 'Black'} wins!`;
      case 'stalemate':
        return 'Stalemate! Game is a draw.';
      case 'draw':
        return `Draw: ${DRAW_REASON_TEXT[gameStatus.reason] || ''}`;
      case 'resigned':
        return `${gameStatus.winner === 'white' ? 'White' : 'Black'} wins by resignation!`;
      default:
        return '';
    }
  };

  const isGameOver = isFinished(gameStatus.status);

  return (
    <View style={styles.container}>
      {isGameOver && (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverText}>{getStatusText()}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  gameOverContainer: {
    backgroundColor: '#2d2d2d',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  gameOverText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default GameInfo;
