import React, {useRef, useEffect} from 'react';
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
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (isMovingPiece || isSourcePiece) {
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
  }, [isMovingPiece, isSourcePiece]);

  const isLight = (row + col) % 2 === 0;
  
  const getBackgroundColor = () => {
    if (isSelected) return COLORS.selected;
    if (isValidMove) return COLORS.validMove;
    return isLight ? COLORS.light : COLORS.dark;
  };

  const getStatuePiece = () => {
    if (!piece) return null;
    
    const isWhite = '♔♕♖♗♘♙'.includes(piece);
    const pieceShadow = isWhite ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';
    const pieceColor = isWhite ? '#FFFFFF' : '#1a1a1a';
    
    const unicodeMap = {
      '♔': '♔', '♚': '♚',
      '♕': '♕', '♛': '♛',
      '♖': '♖', '♜': '♜',
      '♗': '♗', '♝': '♝',
      '♘': '♘', '♞': '♞',
      '♙': '♙', '♟': '♟',
    };
    
    const pieceChar = unicodeMap[piece] || piece;
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
              })
            }
          ],
        }
      ]}>
        <Text style={[
          styles.pieceShadow,
          {fontSize, textShadowColor: pieceShadow}
        ]}>
          {pieceChar}
        </Text>
        <Text style={[
          styles.piece,
          {
            fontSize,
            color: isKingInCheck ? '#FF0000' : pieceColor,
            textShadowColor: isKingInCheck ? '#8B0000' : (isWhite ? '#000000' : '#FFFFFF'),
            textShadowOffset: {width: 1, height: 1},
            textShadowRadius: 2,
          }
        ]}>
          {pieceChar}
        </Text>
      </Animated.View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.square,
        {backgroundColor: getBackgroundColor()},
      ]}
      onPress={() => onPress(row, col)}
      activeOpacity={0.9}>
      {isValidMove && !piece && (
        <Animated.View style={[
          styles.validMoveDot,
          {
            transform: [{
              scale: isValidMove ? new Animated.Value(1) : 1
            }]
          }
        ]} />
      )}
      {isValidMove && piece && (
        <View style={styles.capturedIndicator} />
      )}
      {getStatuePiece()}
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

export default Square;
