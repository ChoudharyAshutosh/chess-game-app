import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const {width: screenWidth} = Dimensions.get('window');

const GameOverModal = ({visible, gameStatus, onClose}) => {
  if (!visible || !gameStatus) return null;

  const isCheckmate = gameStatus.status === 'checkmate';
  const isStalemate = gameStatus.status === 'stalemate';
  const winner = gameStatus.winner;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {isCheckmate
              ? '♔ Checkmate!'
              : isStalemate
              ? '🤝 Stalemate!'
              : '♔ Game Over!'}
          </Text>

          <View style={styles.scoreContainer}>
            <View style={[styles.scoreBox, winner === 'white' && styles.winnerBox]}>
              <Text style={styles.playerLabel}>White</Text>
              <Text style={[styles.scoreText, winner === 'white' && styles.winnerText]}>
                {winner === 'white' ? '1' : '0'}
              </Text>
              {winner === 'white' && <Text style={styles.winnerLabel}>Winner!</Text>}
              {winner === 'black' && <Text style={styles.loserLabel}>Loser</Text>}
            </View>

            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>vs</Text>
            </View>

            <View style={[styles.scoreBox, winner === 'black' && styles.winnerBox]}>
              <Text style={styles.playerLabel}>Black</Text>
              <Text style={[styles.scoreText, winner === 'black' && styles.winnerText]}>
                {winner === 'black' ? '1' : '0'}
              </Text>
              {winner === 'black' && <Text style={styles.winnerLabel}>Winner!</Text>}
              {winner === 'white' && <Text style={styles.loserLabel}>Loser</Text>}
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 24,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreBox: {
    width: 80,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  winnerText: {
    color: '#FFD700',
  },
  winnerLabel: {
    fontSize: 12,
    color: '#FFD700',
    marginTop: 4,
    fontWeight: 'bold',
  },
  loserLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
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
