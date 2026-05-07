import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import NotificationIcon from '../../assets/svg/notification.svg';
import { getAuthData } from '../../services/storage';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  purple: '#7B61FF',
  purpleLight: '#F0EDFF',
  orange: '#FF9F43',
  orangeLight: '#FFF0E1',
};

const TutorHomeScreen = () => {
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState('');
  const [deptName, setDeptName] = useState('');

  useEffect(() => {
    getAuthData().then(data => {
      if (data) {
        setUserName(data.name);
        setDeptName(data.departmentName);
      }
    });
  }, []);

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
                <Text style={styles.greetingText} numberOfLines={1}>{userName || 'Loading...'}</Text>
                <View style={styles.tagContainer}>
                  <Text style={styles.tagText}>TUTOR</Text>
                </View>
              </View>
              <Text style={styles.deptText}>{deptName || '—'}</Text>
            </View>

            <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
              <NotificationIcon width={24} height={24} fill={COLORS.textPrimary} />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Welcome to the Tutor Dashboard</Text>
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
    backgroundColor: 'rgba(255, 159, 67, 0.15)', // Orange tint
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
    shadowColor: COLORS.orange,
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
    borderColor: 'rgba(255, 255, 255, 0.6)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // Frost tint
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
    backgroundColor: COLORS.orangeLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 67, 0.3)',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.orange,
    letterSpacing: 0.5,
  },
  deptText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4757',
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    opacity: 0.7,
  },
});

export default TutorHomeScreen;
