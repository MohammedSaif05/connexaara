import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

// Brand colors matching the logo
const COLORS = {
  darkNavy: '#1B2A4A',
  teal: '#2EC4B6',
  purple: '#7B61FF',
  orange: '#F7A046',
  white: '#FFFFFF',
};

// "CONNEXAARA" with each letter's color
const TITLE_LETTERS = [
  { char: 'C', color: COLORS.darkNavy },
  { char: 'O', color: COLORS.darkNavy },
  { char: 'N', color: COLORS.darkNavy },
  { char: 'N', color: COLORS.darkNavy },
  { char: 'E', color: COLORS.darkNavy },
  { char: 'X', color: COLORS.teal },
  { char: 'A', color: COLORS.purple },
  { char: 'A', color: COLORS.darkNavy },
  { char: 'R', color: COLORS.darkNavy },
  { char: 'A', color: COLORS.darkNavy },
];

// Subtitle words with their colors
const SUBTITLE_WORDS = [
  { text: 'Connect.', color: COLORS.darkNavy },
  { text: 'Learn.', color: COLORS.teal },
  { text: 'Grow.', color: COLORS.purple },
  { text: 'Together.', color: COLORS.orange },
];

type SplashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

interface SplashScreenProps {
  navigation: SplashScreenNavigationProp;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  // Logo animation
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Letter animations - each letter gets its own animated value
  const letterAnimations = useRef(
    TITLE_LETTERS.map(() => new Animated.Value(0)),
  ).current;

  // Subtitle animations - each word gets its own animated value
  const subtitleAnimations = useRef(
    SUBTITLE_WORDS.map(() => new Animated.Value(0)),
  ).current;

  // Fade out everything at the end
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Phase 1: Logo appears with scale + fade (0ms - 800ms)
    const logoAnimation = Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    // Phase 2: Letters appear one by one (800ms - 1800ms)
    const letterStagger = Animated.stagger(
      80,
      letterAnimations.map(anim =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ),
    );

    // Phase 3: Subtitle words appear one by one (1800ms - 2600ms)
    const subtitleStagger = Animated.stagger(
      150,
      subtitleAnimations.map(anim =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ),
    );

    // Phase 4: Hold, then fade out (3200ms - 3800ms)
    const fadeOutAnimation = Animated.timing(fadeOut, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    });

    // Run the full sequence
    Animated.sequence([
      logoAnimation,
      Animated.delay(200),
      letterStagger,
      Animated.delay(200),
      subtitleStagger,
      Animated.delay(800),
      fadeOutAnimation,
    ]).start(() => {
      navigation.replace('GetStarted');
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Title - "CONNEXAARA" letter by letter */}
      <View style={styles.titleContainer}>
        {TITLE_LETTERS.map((letter, index) => {
          const scale = letterAnimations[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          });
          const rotate = letterAnimations[index].interpolate({
            inputRange: [0, 1],
            outputRange: ['-90deg', '0deg'],
          });

          return (
            <Animated.Text
              key={`letter-${index}`}
              style={[
                styles.titleLetter,
                {
                  color: letter.color,
                  opacity: letterAnimations[index],
                  transform: [{ scale }, { rotateY: rotate }],
                },
              ]}>
              {letter.char}
            </Animated.Text>
          );
        })}
      </View>

      {/* Subtitle - "Connect. Learn. Grow. Together." */}
      <View style={styles.subtitleContainer}>
        {SUBTITLE_WORDS.map((word, index) => {
          const translateX = subtitleAnimations[index].interpolate({
            inputRange: [0, 1],
            outputRange: [index % 2 === 0 ? -50 : 50, 0],
          });

          return (
            <Animated.Text
              key={`word-${index}`}
              style={[
                styles.subtitleWord,
                {
                  color: word.color,
                  opacity: subtitleAnimations[index],
                  transform: [{ translateX }],
                },
              ]}>
              {word.text}
              {index < SUBTITLE_WORDS.length - 1 ? ' ' : ''}
            </Animated.Text>
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle shadow behind the logo
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: width * 0.65,
    height: width * 0.65,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: -35,
  },
  titleLetter: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 4,
    fontFamily: 'System',
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  subtitleWord: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

export default SplashScreen;
