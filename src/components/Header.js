import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {customStyles} from '../styles/customStyles';

const Header = () => {
  return (
    <View style={customStyles.header}>
      <Text style={customStyles.headerText}>Chess Game</Text>
    </View>
  );
};

export default Header;
