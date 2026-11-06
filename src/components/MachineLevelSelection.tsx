import React, {useEffect, useRef, type ComponentProps} from 'react';
import {Animated, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {MaterialDesignIcons} from '@react-native-vector-icons/material-design-icons/static';
import type {MachineLevel} from '../types/chess';

interface LevelOption {
  level: MachineLevel;
  title: string;
  description: string;
  icon: ComponentProps<typeof MaterialDesignIcons>['name'];
  color: string;
}

const LEVEL_OPTIONS: LevelOption[] = [
  {
    level: 'easy',
    title: 'Easy',
    description: 'Great for beginners',
    icon: 'chess-pawn',
    color: 'rgba(76, 175, 80, 0.3)',
  },
  {
    level: 'medium',
    title: 'Medium',
    description: 'A fair challenge',
    icon: 'chess-knight',
    color: 'rgba(255, 193, 7, 0.3)',
  },
  {
    level: 'hard',
    title: 'Hard',
    description: 'For experienced players',
    icon: 'chess-queen',
    color: 'rgba(255, 107, 107, 0.3)',
  },
];

interface MachineLevelSelectionProps {
  onSelect: (level: MachineLevel) => void;
  onBack: () => void;
}

const LevelButton = ({
  option,
  index,
  onPress,
}: {
  option: LevelOption;
  index: number;
  onPress: () => void;
}) => {
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 250 + index * 120,
      useNativeDriver: true,
    }).start();
  }, [appear, index]);

  return (
    <Animated.View
      style={{
        opacity: appear,
        transform: [
          {
            translateY: appear.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 0],
            }),
          },
        ],
      }}>
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.levelButton}
        onPress={onPress}
        activeOpacity={0.8}>
        <View style={[styles.iconContainer, {backgroundColor: option.color}]}>
          <MaterialDesignIcons name={option.icon} size={26} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{option.title}</Text>
          <Text style={styles.description}>{option.description}</Text>
        </View>
        <MaterialDesignIcons
          name="chevron-right"
          size={20}
          color="rgba(255, 255, 255, 0.6)"
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const MachineLevelSelection = ({onSelect, onBack}: MachineLevelSelectionProps) => (
  <View style={styles.container}>
    {LEVEL_OPTIONS.map((option, index) => (
      <LevelButton
        key={option.level}
        option={option}
        index={index}
        onPress={() => onSelect(option.level)}
      />
    ))}
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.backButton}
      onPress={onBack}
      activeOpacity={0.7}>
      <MaterialDesignIcons
        name="arrow-left"
        size={18}
        color="rgba(255, 255, 255, 0.7)"
      />
      <Text style={styles.backText}>Back</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  levelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    backgroundColor: '#1a1a2e',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
  },
  backButton: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

export default MachineLevelSelection;
