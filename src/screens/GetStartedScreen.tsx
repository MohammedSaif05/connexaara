import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Linking,
} from 'react-native';
import LottieView from 'lottie-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { saveTermsAgreed } from '../services/storage';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#F5F7FA',
  white: '#FFFFFF',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  buttonPrimary: '#1B2A4A',
  buttonDisabled: '#A0AABF',
  checkActive: '#2EC4B6',
  checkBorder: '#D1D5DB',
  link: '#7B61FF',
  teal: '#2EC4B6',
  purple: '#7B61FF',
};

const TITLE_LETTERS = [
  { char: 'C', color: COLORS.textPrimary },
  { char: 'O', color: COLORS.textPrimary },
  { char: 'N', color: COLORS.textPrimary },
  { char: 'N', color: COLORS.textPrimary },
  { char: 'E', color: COLORS.textPrimary },
  { char: 'X', color: COLORS.teal },
  { char: 'A', color: COLORS.purple },
  { char: 'A', color: COLORS.textPrimary },
  { char: 'R', color: COLORS.textPrimary },
  { char: 'A', color: COLORS.textPrimary },
];

type GetStartedScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GetStarted'>;

interface GetStartedScreenProps {
  navigation: GetStartedScreenNavigationProp;
}

const GetStartedScreen: React.FC<GetStartedScreenProps> = ({ navigation }) => {
  const [agreed, setAgreed] = useState(false);

  const toggleAgreement = () => setAgreed(!agreed);

  const handleGetStarted = async () => {
    // Persist the agreement so the user never sees this screen again
    await saveTermsAgreed();
    navigation.navigate('Login');
  };

  const handleTerms = () => {
    // Open terms link
    Linking.openURL('https://example.com/terms');
  };

  const handlePrivacy = () => {
    // Open privacy link
    Linking.openURL('https://example.com/privacy');
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#EAE5FD', '#BDEBE5']}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.gradientRoot}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        <View style={styles.content}>
        {/* Centered Content */}
        <View style={styles.centerSection}>
          {/* Lottie Animation Placeholder */}
          <View style={styles.animationContainer}>
            <LottieView
              source={require('../assets/animations/campus.json')}
              autoPlay
              loop
              style={styles.animation}
              // If the user's lottie doesn't fit exactly, contain will scale it nicely
              resizeMode="contain"
            />
          </View>

          {/* Branding & Caption */}
          <View style={styles.textContainer}>
            <View style={styles.titleContainer}>
              {TITLE_LETTERS.map((letter, index) => (
                <Text
                  key={`letter-${index}`}
                  style={[styles.titleLetter, { color: letter.color }]}>
                  {letter.char}
                </Text>
              ))}
            </View>
            <Text style={styles.caption}>
              The heartbeat of your campus.{'\n'}
              Connect, discover, and experience{'\n'}
              college life digitally.
            </Text>
          </View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Agreement Checkbox */}
          <View style={styles.agreementContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleAgreement}
              style={styles.checkboxWrapper}>
              <View
                style={[
                  styles.checkbox,
                  agreed && styles.checkboxActive,
                ]}>
                {agreed && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </TouchableOpacity>

            <Text style={styles.agreementText}>
              I agree to the{' '}
              <Text style={styles.linkText} onPress={handleTerms}>
                Terms of Use
              </Text>{' '}
              and acknowledge I have read the{' '}
              <Text style={styles.linkText} onPress={handlePrivacy}>
                Privacy Policy
              </Text>.
            </Text>
          </View>

          {/* Continue / Get Started Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.button,
              !agreed && styles.buttonDisabled,
            ]}
            disabled={!agreed}
            onPress={handleGetStarted}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  animationContainer: {
    height: width * 0.5,
    width: width * 0.5,
    alignSelf: 'center',
    marginBottom: 20,
    // Optional: a subtle background if the lottie needs a container shape like the reference
    backgroundColor: '#FFFFFF',
    borderRadius: (width * 0.5) / 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  titleLetter: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 4,
    fontFamily: 'System',
  },
  caption: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSection: {
    width: '100%',
  },
  agreementContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkboxWrapper: {
    paddingRight: 12,
    paddingTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10, // Circular checkbox like reference image
    borderWidth: 1.5,
    borderColor: COLORS.checkBorder,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxActive: {
    backgroundColor: COLORS.checkActive,
    borderColor: COLORS.checkActive,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  agreementText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  linkText: {
    color: COLORS.link,
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: COLORS.buttonPrimary,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: COLORS.buttonDisabled,
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '600',
  },
});

export default GetStartedScreen;
