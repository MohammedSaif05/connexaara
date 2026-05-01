import React, { createContext, useContext, useState, useRef, ReactNode, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Simple inline SVG Icons based on type
const ToastIcon = ({ type }: { type: ToastType }) => {
  if (type === 'success') {
    return (
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" fill="#E8F9F5" />
        <Path 
          d="M8 12.5L10.5 15L16 9" 
          stroke="#2EC4B6" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </Svg>
    );
  }
  return null; // Fallbacks for error/info can go here
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [isVisible, setIsVisible] = useState(false);
  
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);
    
    setToastMessage(message);
    setToastType(type);
    setIsVisible(true);

    // Reset animations
    translateY.setValue(150);
    opacity.setValue(0);

    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0, // Animate up to its natural bottom position
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 3 seconds
    timerRef.current = setTimeout(() => {
      hideToast();
    }, 3000);
  }, [insets.top]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 150,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
    });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {isVisible && (
        <Animated.View 
          style={[
            styles.toastContainer, 
            {
              transform: [{ translateY }],
              opacity,
            }
          ]}
        >
          <View style={styles.toastContent}>
            <ToastIcon type={toastType} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100, // Safely above bottom tabs
    left: 20,
    right: 20,
    zIndex: 9999, // Render on top of absolutely everything
    alignItems: 'center',
    pointerEvents: 'none', // Don't block touches under the toast
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 100, // Pill shape
    // High premium shadow
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  toastText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#1B2A4A',
  },
});
