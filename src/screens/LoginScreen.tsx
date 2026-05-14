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
import { login, ApiError } from '../services/api';
import { saveAuthData } from '../services/storage';
import type { UserRole } from '../services/storage';
import Loader from '../components/Loader';
import { useToast } from '../components/ToastContext';
import NotificationService from '../services/notificationService';

const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  inputBackground: '#F9FAFB',
  inputBorder: '#E5E7EB',
  inputBorderError: '#EF4444',
  buttonPrimary: '#1B2A4A',
  buttonDisabled: '#A0AABF',
  white: '#FFFFFF',
  teal: '#2EC4B6',
  purple: '#7B61FF',
  error: '#EF4444',
  errorBg: '#FEF2F2',
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

/**
 * Maps a user role (and isTutor flag) to the correct dashboard route name.
 * STAFF (whether tutor or not) → TutorDashboard
 */
const getDashboardRoute = (
  role: UserRole,
  isTutor: boolean,
): keyof RootStackParamList => {
  switch (role) {
    case 'HOD':
      return 'HODDashboard';
    case 'STAFF':
      return 'TutorDashboard';
    case 'STUDENT':
      return 'StudentDashboard';
    default:
      return 'Login';
  }
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    Keyboard.dismiss();

    // Basic client-side validation
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await login(email.trim(), password);
      console.log('\n\n=== LOGIN RESPONSE ===\n', JSON.stringify(response.user, null, 2), '\n======================\n\n');

      // Persist auth data to local storage for session restoration
      await saveAuthData({
        token: response.accessToken,
        role: response.user.role,
        isTutor: response.user.isTutor,
        userId: response.user.id,
        name: response.user.name,
        email: response.user.email,
        departmentName: response.user.department?.name ?? '',
        departmentId: response.user.departmentId ?? null,
        batchId: response.user.batch?.id ?? null,
        batchName: response.user.batch?.name ?? null,
        currentSemester: response.user.batch?.currentSemester ?? null,
      });

      // Register FCM token with the backend now that user is authenticated
      NotificationService.registerTokenAfterLogin();

      // Clear loading state first so the BlurView is unmounted natively
      setIsLoading(false);

      // Add a tiny delay to allow Android to clean up the BlurView overlay
      setTimeout(() => {
        // Navigate to the correct dashboard immediately and wipe the auth stack
        const route = getDashboardRoute(response.user.role, response.user.isTutor);
        navigation.reset({ index: 0, routes: [{ name: route }] });

        // Show success toast after navigation (ToastContext is global, renders on new screen)
        const lastName = response.user.name.trim().split(' ').pop() ?? response.user.name;
        showToast(`Welcome back, ${lastName}!`, 'success');
      }, 50);

    } catch (err) {
      setIsLoading(false);
      if (err instanceof ApiError) {
        if (err.statusCode === 401 || err.statusCode === 403) {
          setErrorMessage('Invalid email or password. Please try again.');
        } else if (err.statusCode === 0) {
          // Network / timeout error from our api.ts
          setErrorMessage(err.message);
        } else {
          setErrorMessage(err.message || 'Something went wrong. Please try again.');
        }
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    }
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

              {/* Inline Error Banner */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              {/* Form */}
              <View style={styles.formContainer}>
                <View style={[
                  styles.inputContainer,
                  errorMessage && !password && styles.inputContainerError,
                ]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(text) => { setEmail(text); setErrorMessage(null); }}
                    editable={!isLoading}
                  />
                </View>

                <View style={[
                  styles.inputContainer,
                  errorMessage && !password && styles.inputContainerError,
                ]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={COLORS.textSecondary}
                    secureTextEntry
                    value={password}
                    onChangeText={(text) => { setPassword(text); setErrorMessage(null); }}
                    editable={!isLoading}
                    onSubmitEditing={handleSignIn}
                    returnKeyType="done"
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
                  onPress={handleSignIn}
                  disabled={isLoading}>
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </TouchableOpacity>
              </View>

            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {/* Full-screen jumping dots loader overlay */}
      <Loader visible={isLoading} />
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
  signInButtonDisabled: {
    opacity: 0.7,
  },
  errorBanner: {
    backgroundColor: COLORS.errorBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputContainerError: {
    borderColor: COLORS.inputBorderError,
  },
});

export default LoginScreen;
