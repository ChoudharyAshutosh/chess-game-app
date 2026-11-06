import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';

const DOT_COUNT = 3;
const CYCLE_MS = 1000;
const DOT_START = [0, 0.2, 0.4];

// One looping value drives all the dots on the native side, so they keep moving
// even while the move search keeps JavaScript busy.
const ThinkingIndicator = () => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel="Machine is thinking"
      accessibilityLiveRegion="polite">
      <Text style={styles.label} numberOfLines={1}>
        Thinking
      </Text>
      <View style={styles.dots}>
        {Array.from({length: DOT_COUNT}, (_, index) => {
          const start = DOT_START[index];
          const inputRange = [start, start + 0.25, start + 0.5];
          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: progress.interpolate({
                    inputRange,
                    outputRange: [0.35, 1, 0.35],
                    extrapolate: 'clamp',
                  }),
                  transform: [
                    {
                      translateY: progress.interpolate({
                        inputRange,
                        outputRange: [0, -4, 0],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 6,
    height: 7,
    alignItems: 'flex-end',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFD700',
  },
});

export default ThinkingIndicator;
