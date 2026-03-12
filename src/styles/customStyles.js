import {StyleSheet, Dimensions} from 'react-native';

const {width: screenWidth} = Dimensions.get('window');
const BOARD_SIZE = Math.min(screenWidth - 20, 400);

export const customStyles = StyleSheet.create({
  boardContainer: {
    aspectRatio: 1,
    borderWidth: 4,
    borderColor: '#4a3728',
    borderRadius: 4,
    width: BOARD_SIZE,
    height: BOARD_SIZE,
  },
});
