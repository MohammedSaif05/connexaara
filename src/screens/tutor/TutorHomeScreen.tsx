import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import NotificationIcon from '../../assets/svg/notification.svg';
import TimetableIcon from '../../assets/svg/calendar.svg'; // Reusing an existing icon or fallback
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionCard} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('TutorTimetable')}
        >
          <View style={[styles.iconContainer, { backgroundColor: COLORS.purpleLight }]}>
            <TimetableIcon width={28} height={28} fill={COLORS.purple} />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Class Timetable</Text>
            <Text style={styles.actionDesc}>View your batch schedule</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 20,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});

export default TutorHomeScreen;
