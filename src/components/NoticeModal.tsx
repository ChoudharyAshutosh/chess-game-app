import React, {useEffect, useRef, type ComponentProps} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {MaterialIcons} from '@react-native-vector-icons/material-icons/static';

const {width: screenWidth} = Dimensions.get('window');

export interface NoticeAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onPress?: () => void; // Runs after the modal has finished closing.
}

export interface Notice {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  message: string;
  actions?: NoticeAction[]; // Defaults to a single OK button.
}

const DEFAULT_ACTIONS: NoticeAction[] = [{label: 'OK'}];

interface NoticeModalProps {
  notice: Notice | null;
  onClose: () => void;
}

// Mounted once per notice, so each one opens with fresh animation values.
const NoticeContent = ({notice, onClose}: {notice: Notice; onClose: () => void}) => {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(100),
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [backdropOpacity, cardOpacity, cardScale, iconScale]);

  const close = (action?: NoticeAction) => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.9,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      action?.onPress?.();
    });
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => close()}>
      <Animated.View style={[styles.overlay, {opacity: backdropOpacity}]}>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.card,
            {opacity: cardOpacity, transform: [{scale: cardScale}]},
          ]}>
          <Animated.View
            style={[styles.iconCircle, {transform: [{scale: iconScale}]}]}>
            <MaterialIcons name={notice.icon} size={36} color="#FFD700" />
          </Animated.View>
          <Text accessibilityRole="header" style={styles.title}>
            {notice.title}
          </Text>
          <Text style={styles.message}>{notice.message}</Text>
          <View style={styles.actions}>
            {(notice.actions ?? DEFAULT_ACTIONS).map(action => {
              const variant = action.variant ?? 'primary';
              return (
                <TouchableOpacity
                  key={action.label}
                  accessibilityRole="button"
                  style={[styles.button, BUTTON_STYLES[variant]]}
                  onPress={() => close(action)}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.buttonText,
                      variant === 'primary'
                        ? styles.primaryButtonText
                        : styles.lightButtonText,
                    ]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const NoticeModal = ({notice, onClose}: NoticeModalProps) =>
  notice ? <NoticeContent notice={notice} onClose={onClose} /> : null;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: screenWidth * 0.82,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 22,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: 12,
  },
  button: {
    flex: 1,
    maxWidth: 170,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dangerButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.25)',
    borderColor: 'rgba(255, 107, 107, 0.6)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryButtonText: {
    color: '#1a1a2e',
  },
  lightButtonText: {
    color: '#fff',
  },
});

const BUTTON_STYLES = {
  primary: styles.primaryButton,
  secondary: styles.secondaryButton,
  danger: styles.dangerButton,
};

export default NoticeModal;
