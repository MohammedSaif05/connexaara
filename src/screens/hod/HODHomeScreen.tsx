import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import NotificationIcon from '../../assets/svg/notification.svg';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  purple: '#7B61FF',
  purpleLight: '#F0EDFF',
};

const HODHomeScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Abstract background shapes to refract through the glass */}
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />

      {/* Premium Glassmorphism Header */}
      <View style={[styles.headerShadow, { marginTop: Math.max(insets.top, 10) + 10 }]}>
        <View style={styles.headerWrapper}>
          <BlurView
            style={styles.absoluteBlur}
            blurType="light"
            blurAmount={25}
            reducedTransparencyFallbackColor="white"
          />
          <View style={styles.headerContainer}>
            <View style={styles.userInfoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.greetingText}>Dr. Sarah Smith</Text>
            <View style={styles.tagContainer}>
              <Text style={styles.tagText}>HOD</Text>
            </View>
          </View>
          <Text style={styles.deptText}>Computer Science & Engineering</Text>
        </View>

          <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
            <NotificationIcon width={24} height={24} fill={COLORS.textPrimary} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Welcome to the Home Screen</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  bgBlob1: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(123, 97, 255, 0.15)', // Purple tint
  },
  bgBlob2: {
    position: 'absolute',
    top: 60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(46, 196, 182, 0.15)', // Teal tint
  },
  headerShadow: {
    marginHorizontal: 16,
    marginBottom: 20,
    // Soft glowing shadow
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  headerWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)', // Glossy border
  },
  absoluteBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Translucent frosty tint
  },
  userInfoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginRight: 10,
    letterSpacing: -0.5,
  },
  tagContainer: {
    backgroundColor: COLORS.purpleLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    color: COLORS.purple,
    fontSize: 12,
    fontWeight: '700',
  },
  deptText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  notificationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4B4B',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 20,
  },
});

export default HODHomeScreen;
