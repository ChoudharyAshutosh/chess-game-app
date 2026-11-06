import React, {memo, useRef, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, Easing} from 'react-native';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
const BOARD_SIZE = Math.min(screenWidth - 16, screenHeight * 0.5);
const SQUARE_SIZE = BOARD_SIZE / 8;

const COLORS = {
  light: '#E8D5B7',
  dark: '#A67C52',
  highlight: '#7FC97F',
  selected: '#FFD700',
  validMove: '#98FB98',
};

// Animation values live here, not in Square, so they are discarded when the piece
// leaves the square. React Native freezes a value when its view unmounts, and a
// piece redrawn with frozen values stays enlarged and off-centre.
const PieceView = ({piece, isAnimating, isKingInCheck}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAnimating) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 120,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 120,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 120,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 120,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [isAnimating, scaleAnim, bounceAnim]);

  const isWhite = '♔♕♖♗♘♙'.includes(piece);
  const pieceShadow = isWhite ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';
  const pieceColor = isWhite ? '#FFFFFF' : '#1a1a1a';
  const fontSize = SQUARE_SIZE * 0.75;

  return (
    <Animated.View style={[
      styles.pieceWrapper,
      {
        transform: [
          {scale: scaleAnim},
          {
            translateY: bounceAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -8],
            }),
          },
        ],
      },
    ]}>
      <Text style={[
        styles.pieceShadow,
        {fontSize, textShadowColor: pieceShadow},
      ]}>
        {piece}
      </Text>
      <Text style={[
        styles.piece,
        {
          fontSize,
          color: isKingInCheck ? '#FF0000' : pieceColor,
          textShadowColor: isKingInCheck ? '#8B0000' : (isWhite ? '#000000' : '#FFFFFF'),
          textShadowOffset: {width: 1, height: 1},
          textShadowRadius: 2,
        },
      ]}>
        {piece}
      </Text>
    </Animated.View>
  );
};

const Square = ({
  row,
  col,
  piece,
  isSelected,
  isValidMove,
  onPress,
  isMovingPiece,
  isSourcePiece,
  isKingInCheck,
}) => {
  const isLight = (row + col) % 2 === 0;

  const getBackgroundColor = () => {
    if (isSelected) return COLORS.selected;
    if (isValidMove) return COLORS.validMove;
    return isLight ? COLORS.light : COLORS.dark;
  };

  return (
    <TouchableOpacity
      style={[
        styles.square,
        {backgroundColor: getBackgroundColor()},
      ]}
      onPress={() => onPress(row, col)}
      activeOpacity={0.9}>
      {isValidMove && !piece && <View style={styles.validMoveDot} />}
      {isValidMove && piece && (
        <View style={styles.capturedIndicator} />
      )}
      {piece ? (
        <PieceView
          piece={piece}
          isAnimating={!!(isMovingPiece || isSourcePiece)}
          isKingInCheck={isKingInCheck}
        />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieceWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  piece: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pieceShadow: {
    position: 'absolute',
    fontWeight: 'bold',
    textAlign: 'center',
    opacity: 0.4,
  },
  validMoveDot: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.24,
    height: SQUARE_SIZE * 0.24,
    borderRadius: SQUARE_SIZE * 0.12,
    backgroundColor: 'rgba(80, 180, 80, 0.75)',
  },
  capturedIndicator: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.94,
    height: SQUARE_SIZE * 0.94,
    borderWidth: 3.5,
    borderColor: 'rgba(220, 30, 60, 0.9)',
    borderRadius: 4,
  },
});

// Only the squares whose props changed redraw, instead of all 64 on every tap.
export default memo(Square);
