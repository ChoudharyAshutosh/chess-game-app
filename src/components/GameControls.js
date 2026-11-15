import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {MaterialIcons} from '@react-native-vector-icons/material-icons/static';
import {isGameOver as isFinished} from '../utils/chessUtils';

// Pressable rather than TouchableOpacity: TouchableOpacity animates its own
// opacity, and on the New Architecture that animation can leave a button
// looking disabled after it has been enabled again. Here the dimming is worked
// out from the current props on every render, so it always matches.
const ControlButton = ({icon, label, onPress, disabled, style, ad}) => (
  <Pressable
    style={({pressed}) => [
      styles.button,
      style,
      disabled && styles.disabledButton,
      pressed && !disabled && styles.pressedButton,
    ]}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityState={{disabled: !!disabled}}
    accessibilityLabel={ad ? `${label}, watch an ad` : label}>
    <MaterialIcons name={icon} size={20} color="#fff" />
    <Text style={styles.buttonText}>{label}</Text>
    {ad && (
      <View style={styles.adBadge}>
        <MaterialIcons name="smart-display" size={11} color="#0f0c29" />
        <Text style={styles.adText}>AD</Text>
      </View>
    )}
  </Pressable>
);

// Three rows, most used first: help during the game (both watch an ad), ending
// the game, then leaving it. All buttons are the same size. When the game is over only Menu and Play Again remain.
const GameControls = ({
  gameStatus,
  onReset,
  onBack,
  onResign,
  onOfferDraw,
  canOfferDraw,
  onUndo,
  canUndo,
  onHint,
  canHint,
}) => {
  const isGameOver = isFinished(gameStatus.status);

  if (isGameOver) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <ControlButton icon="arrow-back" label="Menu" onPress={onBack} />
          <ControlButton
            icon="replay"
            label="Play Again"
            onPress={onReset}
            style={styles.retryButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ControlButton
          icon="lightbulb-outline"
          label="Hint"
          onPress={onHint}
          disabled={!canHint}
          style={styles.hintButton}
          ad
        />
        <ControlButton
          icon="undo"
          label="Undo"
          onPress={onUndo}
          disabled={!canUndo}
          style={styles.undoButton}
          ad
        />
      </View>
      <View style={styles.row}>
        <ControlButton
          icon="handshake"
          label="Offer Draw"
          onPress={onOfferDraw}
          disabled={!canOfferDraw}
          style={styles.drawButton}
        />
        <ControlButton
          icon="flag"
          label="Resign"
          onPress={onResign}
          style={styles.resignButton}
        />
      </View>
      <View style={styles.row}>
        <ControlButton icon="arrow-back" label="Menu" onPress={onBack} />
        <ControlButton
          icon="refresh"
          label="Restart"
          onPress={onReset}
          style={styles.resetButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    // A fixed height keeps every button the same size, with or without an AD tag.
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
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
  drawButton: {
    backgroundColor: 'rgba(100, 181, 246, 0.2)',
    borderColor: 'rgba(100, 181, 246, 0.3)',
  },
  undoButton: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  hintButton: {
    backgroundColor: 'rgba(0, 188, 212, 0.2)',
    borderColor: 'rgba(0, 188, 212, 0.35)',
  },
  resignButton: {
    backgroundColor: 'rgba(158, 158, 158, 0.2)',
    borderColor: 'rgba(158, 158, 158, 0.3)',
  },
  disabledButton: {
    opacity: 0.4,
  },
  pressedButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  adBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFD700',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  adText: {
    color: '#0f0c29',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default GameControls;
