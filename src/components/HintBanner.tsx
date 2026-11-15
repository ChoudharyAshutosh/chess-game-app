import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { getPieceType, squareToAlgebraic } from '../utils/chessUtils';
import type { Color, Piece, SquarePosition } from '../types/chess';

export interface HintBannerProps {
  color: Color; // The side the hint is for.
  // The suggested move, or null while it is still being worked out.
  move: { from: SquarePosition; to: SquarePosition; piece: Piece } | null;
  // Ask whether the game should play the move for the player.
  asking?: boolean;
  onPlay?: () => void;
  onDismiss?: () => void;
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

// Says whose hint it is and what it suggests, in words, next to the arrow on
// the board, e.g. "Hint for White: move the Knight from g1 to f3".
const HintBanner = ({
  color,
  move,
  asking = false,
  onPlay,
  onDismiss,
}: HintBannerProps) => {
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [appear]);

  const side = capitalize(color);
  const pieceName = move ? capitalize(getPieceType(move.piece) ?? 'piece') : '';

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          opacity: appear,
          transform: [
            {
              translateY: appear.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        {move ? (
          <MaterialIcons name="lightbulb" size={18} color="#4DD0E1" />
        ) : (
          <ActivityIndicator size="small" color="#4DD0E1" />
        )}
        <View style={styles.textBox}>
          {move ? (
            <Text style={styles.text} numberOfLines={2}>
              <Text style={styles.strong}>Hint for {side}: </Text>
              move the {pieceName} from {squareToAlgebraic(move.from)} to{' '}
              {squareToAlgebraic(move.to)}
            </Text>
          ) : (
            <Text style={styles.text} numberOfLines={1}>
              Finding the best move for{' '}
              <Text style={styles.strong}>{side}</Text>…
            </Text>
          )}
        </View>
      </View>
      {move && asking && (
        <View style={styles.question}>
          <Text style={styles.questionText}>Play this move for you?</Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.noButton]}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>No thanks</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.yesButton]}
              onPress={onPlay}
              activeOpacity={0.7}
            >
              <MaterialIcons name="play-arrow" size={18} color="#0f0c29" />
              <Text style={[styles.buttonText, styles.yesText]}>Play it</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 12, 41, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(77, 208, 225, 0.5)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  question: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  questionText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    flexShrink: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 2,
  },
  noButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  yesButton: {
    backgroundColor: '#4DD0E1',
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  yesText: {
    color: '#0f0c29',
  },
  textBox: {
    flexShrink: 1,
  },
  text: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  strong: {
    color: '#4DD0E1',
    fontWeight: 'bold',
  },
});

export default HintBanner;
