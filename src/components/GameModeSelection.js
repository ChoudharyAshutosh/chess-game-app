import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const GameModeSelection = ({onSelectMode}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const button1Anim = useRef(new Animated.Value(0)).current;
  const button2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.stagger(200, [
      Animated.timing(button1Anim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(button2Anim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = (anim) => {
    Animated.timing(anim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (anim) => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundPattern}>
        {[...Array(15)].map((_, i) => (
          <View key={i} style={[
            styles.patternCircle,
            {
              left: Math.random() * screenWidth,
              top: Math.random() * screenHeight,
              width: 80 + Math.random() * 150,
              height: 80 + Math.random() * 150,
              opacity: 0.03 + Math.random() * 0.08,
            }
          ]} />
        ))}
      </View>

      <Animated.View style={[
        styles.content,
        {
          opacity: fadeAnim,
          transform: [{scale: scaleAnim}],
        }
      ]}>
        <View style={styles.logoContainer}>
          <View style={styles.logoGlow}>
            <Text style={styles.logo}>♔</Text>
          </View>
        </View>
        
        <Text style={styles.title}>Chess</Text>
        <Text style={styles.subtitle}>Master the Board</Text>

        <View style={styles.buttonContainer}>
          <AnimatedTouchable
            style={[
              styles.modeButton,
              {
                opacity: button1Anim,
                transform: [{scale: button1Anim}],
              }
            ]}
            onPress={() => onSelectMode('PvP')}
            onPressIn={() => handlePressIn(button1Anim)}
            onPressOut={() => handlePressOut(button1Anim)}
            activeOpacity={0.9}>
            <View style={styles.buttonBackground}>
              <View style={styles.buttonGradient1} />
            </View>
            <View style={styles.buttonContent}>
              <View style={styles.iconContainer}>
                <Text style={styles.modeIcon}>👥</Text>
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.modeTitle}>Player vs Player</Text>
                <Text style={styles.modeDescription}>Challenge a friend</Text>
              </View>
              <View style={styles.arrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </View>
          </AnimatedTouchable>

          <AnimatedTouchable
            style={[
              styles.modeButton,
              {
                opacity: button2Anim,
                transform: [{scale: button2Anim}],
              }
            ]}
            onPress={() => onSelectMode('PvM')}
            onPressIn={() => handlePressIn(button2Anim)}
            onPressOut={() => handlePressOut(button2Anim)}
            activeOpacity={0.9}>
            <View style={styles.buttonBackground}>
              <View style={styles.buttonGradient2} />
            </View>
            <View style={styles.buttonContent}>
              <View style={[styles.iconContainer, styles.iconContainerSecondary]}>
                <Text style={styles.modeIcon}>🤖</Text>
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.modeTitle}>Player vs Machine</Text>
                <Text style={styles.modeDescription}>Test your skills</Text>
              </View>
              <View style={styles.arrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </View>
          </AnimatedTouchable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Tap a mode to start</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  backgroundPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  logo: {
    fontSize: 70,
    color: '#FFD700',
    textShadowColor: 'rgba(255, 215, 0, 0.8)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 4,
    marginTop: 8,
    marginBottom: 40,
    textTransform: 'uppercase',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  modeButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  buttonBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  buttonGradient1: {
    flex: 1,
    backgroundColor: 'rgba(30, 60, 114, 0.6)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
  },
  buttonGradient2: {
    flex: 1,
    backgroundColor: 'rgba(90, 34, 139, 0.5)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(159, 112, 162, 0.3)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerSecondary: {
    backgroundColor: 'rgba(159, 112, 162, 0.35)',
  },
  modeIcon: {
    fontSize: 28,
  },
  buttonTextContainer: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: Platform.OS === 'ios' ? 'center' : 'flex-start',
  },
  arrowText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 18,
  },
  footer: {
    marginTop: 40,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    letterSpacing: 2,
  },
});

export default GameModeSelection;
