import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {MaterialDesignIcons} from '@react-native-vector-icons/material-design-icons/static';
import {PIECE_VALUES, DRAW_REASON_TEXT} from '../utils/chessUtils';

const {width: screenWidth} = Dimensions.get('window');

const GameOverModal = ({visible, gameStatus, capturedWhite, capturedBlack, onClose}) => {
  if (!visible || !gameStatus) return null;

  const {status, winner, reason, loser} = gameStatus;
  const isDraw = status === 'stalemate' || status === 'draw';
  const colorName = color => (color === 'white' ? 'White' : 'Black');

  const title =
    status === 'checkmate'
      ? 'Checkmate!'
      : status === 'stalemate'
      ? 'Stalemate!'
      : status === 'draw'
      ? 'Draw!'
      : status === 'resigned'
      ? 'Resigned'
      : 'Game Over!';

  const subtitle =
    status === 'checkmate'
      ? `${colorName(winner)} wins by checkmate`
      : status === 'resigned'
      ? `${colorName(loser)} resigned. ${colorName(winner)} wins`
      : isDraw
      ? `Draw: ${DRAW_REASON_TEXT[reason] || DRAW_REASON_TEXT.stalemate}`
      : '';

  const calculateScore = (capturedPieces) => {
    return capturedPieces.reduce((sum, piece) => sum + (PIECE_VALUES[piece] || 0), 0);
  };

  const whiteScore = calculateScore(capturedBlack || []);
  const blackScore = calculateScore(capturedWhite || []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.titleRow}>
            <MaterialDesignIcons
              name={isDraw ? 'handshake' : 'chess-king'}
              size={32}
              color="#FFD700"
              style={styles.titleIcon}
            />
            <Text style={styles.title}>{title}</Text>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <View style={styles.scoreContainer}>
            <View style={styles.playerSection}>
              <View style={[styles.scoreBox, winner === 'white' && styles.winnerBox]}>
                <Text style={styles.playerLabel}>White</Text>
                <Text style={[styles.scoreText, winner === 'white' && styles.winnerText]}>
                  {whiteScore}
                </Text>
                <Text style={styles.capturedText}>
                  ({capturedBlack?.length || 0} pieces)
                </Text>
              </View>
              {winner === 'white' && <Text style={styles.winnerLabel}>Winner!</Text>}
              {winner === 'black' && winner !== 'white' && <Text style={styles.loserLabel}>Loser</Text>}
            </View>

            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>vs</Text>
            </View>

            <View style={styles.playerSection}>
              <View style={[styles.scoreBox, winner === 'black' && styles.winnerBox]}>
                <Text style={styles.playerLabel}>Black</Text>
                <Text style={[styles.scoreText, winner === 'black' && styles.winnerText]}>
                  {blackScore}
                </Text>
                <Text style={styles.capturedText}>
                  ({capturedWhite?.length || 0} pieces)
                </Text>
              </View>
              {winner === 'black' && <Text style={styles.winnerLabel}>Winner!</Text>}
              {winner === 'white' && winner !== 'black' && <Text style={styles.loserLabel}>Loser</Text>}
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: screenWidth * 0.8,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 20,
    textAlign: 'center',
  },
  titleIcon: {
    marginRight: 10,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  playerSection: {
    alignItems: 'center',
  },
  scoreBox: {
    width: 90,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  winnerBox: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  playerLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  capturedText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  winnerText: {
    color: '#FFD700',
  },
  winnerLabel: {
    fontSize: 18,
    color: '#FFD700',
    marginTop: 8,
    fontWeight: 'bold',
  },
  loserLabel: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    fontWeight: 'bold',
  },
  vsContainer: {
    marginHorizontal: 16,
  },
  vsText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  button: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  buttonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GameOverModal;
