import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

const GameControls = ({gameStatus, onReset, onBack}) => {
  const isGameOver = gameStatus.status === 'checkmate' || gameStatus.status === 'stalemate';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={onBack}
        activeOpacity={0.7}>
        <Text style={styles.buttonIcon}>⏮</Text>
        <Text style={styles.buttonText}>Menu</Text>
      </TouchableOpacity>

      {isGameOver && (
        <TouchableOpacity
          style={[styles.button, styles.retryButton]}
          onPress={onReset}
          activeOpacity={0.7}>
          <Text style={styles.buttonIcon}>🔄</Text>
          <Text style={styles.buttonText}>Play Again</Text>
        </TouchableOpacity>
      )}

      {!isGameOver && (
        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={onReset}
          activeOpacity={0.7}>
          <Text style={styles.buttonIcon}>↺</Text>
          <Text style={styles.buttonText}>Restart</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 8,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  retryButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  buttonIcon: {
    fontSize: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GameControls;
