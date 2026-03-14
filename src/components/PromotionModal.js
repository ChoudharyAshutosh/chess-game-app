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

const PROMOTION_PIECES = {
  white: [
    {piece: '♕', name: 'Queen', value: '♕'},
    {piece: '♖', name: 'Rook', value: '♖'},
    {piece: '♗', name: 'Bishop', value: '♗'},
    {piece: '♘', name: 'Knight', value: '♘'},
  ],
  black: [
    {piece: '♛', name: 'Queen', value: '♛'},
    {piece: '♜', name: 'Rook', value: '♜'},
    {piece: '♝', name: 'Bishop', value: '♝'},
    {piece: '♞', name: 'Knight', value: '♞'},
  ],
};

const PromotionModal = ({visible, color, onSelect}) => {
  if (!visible || !color) return null;

  const pieces = PROMOTION_PIECES[color];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Promote Pawn</Text>
          <Text style={styles.subtitle}>Choose a piece</Text>
          
          <View style={styles.piecesContainer}>
            {pieces.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.pieceButton}
                onPress={() => onSelect(item.value)}>
                <Text style={styles.pieceText}>{item.piece}</Text>
                <Text style={styles.pieceName}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
    width: screenWidth * 0.85,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 20,
  },
  piecesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  pieceButton: {
    width: 60,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  pieceText: {
    fontSize: 40,
    color: '#fff',
  },
  pieceName: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
});

export default PromotionModal;
