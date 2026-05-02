import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ImageBackground,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Loader from '../components/Loader';

const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  inputBackground: '#F9FAFB',
  inputBorder: '#E5E7EB',
  buttonPrimary: '#1B2A4A',
  white: '#FFFFFF',
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

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = () => {
    Keyboard.dismiss();
    setIsLoading(true);

    // Simulate API call for login
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate('TutorDashboard');
    }, 2500);
  };

  return (
    <ImageBackground
      source={require('../assets/images/login-background.jpg')}
      style={styles.container}
      blurRadius={15}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.content}>

              {/* Logo */}
              <View style={styles.logoContainer}>
                <Image
                  source={require('../assets/images/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              {/* Title */}
              <View style={styles.titleContainer}>
                {TITLE_LETTERS.map((letter, index) => (
                  <Text
                    key={`letter-${index}`}
                    style={[styles.titleLetter, { color: letter.color }]}>
                    {letter.char}
                  </Text>
                ))}
              </View>

              {/* Subtitle */}
              <Text style={styles.subtitle}>Login to your Account</Text>

              {/* Form */}
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={COLORS.textSecondary}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.signInButton}
                  onPress={handleSignIn}>
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </TouchableOpacity>
              </View>

            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
        <Loader visible={isLoading} />
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 0,
  },
  logo: {
    width: 180,
    height: 180,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  titleLetter: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 3,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 24,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    // Soft shadow like reference image
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  input: {
    height: 56,
    paddingHorizontal: 20,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  signInButton: {
    backgroundColor: COLORS.buttonPrimary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    // Button shadow
    shadowColor: COLORS.buttonPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default LoginScreen;
