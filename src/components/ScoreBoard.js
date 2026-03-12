import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const ScoreBoard = ({
  currentTurn,
  gameMode,
  capturedWhite,
  capturedBlack,
  gameStatus,
}) => {
  const PIECE_VALUES = {
    '♙': 1, '♟': 1,
    '♘': 3, '♞': 3,
    '♗': 3, '♝': 3,
    '♖': 5, '♜': 5,
    '♕': 9, '♛': 9,
  };

  const getScore = (captured) => {
    return captured.reduce((sum, piece) => sum + (PIECE_VALUES[piece] || 0), 0);
  };

  const whiteScore = getScore(capturedBlack);
  const blackScore = getScore(capturedWhite);

  const getStatusText = () => {
    if (gameStatus.status === 'check') {
      return 'CHECK';
    }
    if (gameStatus.status === 'checkmate') {
      return 'CHECKMATE';
    }
    if (gameStatus.status === 'stalemate') {
      return 'DRAW';
    }
    return '';
  };

  const statusText = getStatusText();
  const isCheckOrMate = gameStatus.status === 'check' || gameStatus.status === 'checkmate';

  return (
    <View style={styles.container}>
      <View style={styles.playerCard}>
        <View style={[styles.indicator, currentTurn === 'white' && styles.activeIndicator]} />
        <View style={styles.playerInfo}>
          <Text style={styles.playerLabel}>White</Text>
          <View style={styles.piecesRow}>
            {capturedBlack.length > 0 ? (
              capturedBlack.map((piece, index) => (
                <Text key={index} style={styles.capturedPiece}>{piece}</Text>
              ))
            ) : (
              <Text style={styles.noCaptures}>-</Text>
            )}
          </View>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.score}>{whiteScore}</Text>
        </View>
      </View>

      <View style={styles.centerSection}>
        {statusText ? (
          <View style={[styles.statusBadge, isCheckOrMate && styles.statusBadgeAlert]}>
            <Text style={[styles.statusText, isCheckOrMate && styles.statusTextAlert]}>
              {statusText}
            </Text>
          </View>
        ) : null}
        <Text style={styles.turnText}>
          {gameMode === 'PvM' 
            ? (currentTurn === 'white' ? "Your Turn" : "Machine")
            : (currentTurn === 'white' ? "White's Turn" : "Black's Turn")
          }
        </Text>
      </View>

      <View style={[styles.playerCard, styles.playerCardRight]}>
        <View style={[styles.indicator, currentTurn === 'black' && styles.activeIndicator]} />
        <View style={styles.playerInfo}>
          <Text style={styles.playerLabel}>
            {gameMode === 'PvM' ? 'Machine' : 'Black'}
          </Text>
          <View style={styles.piecesRow}>
            {capturedWhite.length > 0 ? (
              capturedWhite.map((piece, index) => (
                <Text key={index} style={styles.capturedPiece}>{piece}</Text>
              ))
            ) : (
              <Text style={styles.noCaptures}>-</Text>
            )}
          </View>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.score}>{blackScore}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  playerCardRight: {
    flexDirection: 'row-reverse',
  },
  indicator: {
    width: 8,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeIndicator: {
    backgroundColor: '#4CAF50',
  },
  playerInfo: {
    flex: 1,
  },
  playerLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  piecesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  capturedPiece: {
    fontSize: 12,
    marginRight: 1,
    color: '#fff',
  },
  noCaptures: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  score: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  centerSection: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusBadgeAlert: {
    backgroundColor: 'rgba(255, 82, 82, 0.3)',
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statusTextAlert: {
    color: '#FF5252',
  },
  turnText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ScoreBoard;
