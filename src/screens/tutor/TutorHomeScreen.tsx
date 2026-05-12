import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import NotificationIcon from '../../assets/svg/notification.svg';
import TimetableIcon from '../../assets/svg/calendar.svg';
import StudentsIcon from '../../assets/svg/tutor-profile.svg';
import SubjectsIcon from '../../assets/svg/tutor-subjects.svg';
import ClockIcon from '../../assets/svg/clock.svg';
import { getAuthData } from '../../services/storage';
import { getStudents, getSubjects, getTimetable, TimetableSlot } from '../../services/api';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  purple: '#7B61FF',
  purpleLight: '#F0EDFF',
  orange: '#FF9F43',
  orangeLight: '#FFF0E1',
  teal: '#2EC4B6',
  tealLight: '#E6FAF8',
  danger: '#FF4757',
  dangerLight: '#FFE5E7',
  breakBg: '#F3F4F6',
  breakText: '#9CA3AF',
  lunchBg: '#FFF4E5',
  lunchText: '#B26A00',
  border: '#E8EBF0',
};

const TutorHomeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [userName, setUserName] = useState('');
  const [deptName, setDeptName] = useState('');
  const [batchId, setBatchId] = useState<string | null>(null);
  const [currentSemester, setCurrentSemester] = useState<number | null>(null);

  // Stats State
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [totalSubjects, setTotalSubjects] = useState<number>(0);
  const [currentSlot, setCurrentSlot] = useState<TimetableSlot | 'FREE' | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    getAuthData().then(data => {
      if (data) {
        setUserName(data.name);
        setDeptName(data.departmentName);
        if (data.batchId) setBatchId(data.batchId);
        if (data.currentSemester) setCurrentSemester(data.currentSemester);
      }
    });
  }, []);

  const fetchDashboardStats = useCallback(async (silent = false) => {
    if (!batchId || !currentSemester) {
      if (!silent) setIsLoading(false);
      return;
    }

    if (!silent) setIsLoading(true);
    try {
      // Fetch concurrently for speed
      const [studentsRes, subjectsRes, timetableRes] = await Promise.all([
        getStudents(batchId, 1, 1, '', true).catch(() => null),
        getSubjects(1, 1, '', currentSemester).catch(() => null),
        getTimetable(batchId, currentSemester).catch(() => null)
      ]);

      if (studentsRes) setTotalStudents(studentsRes.meta.total);
      if (subjectsRes) setTotalSubjects(subjectsRes.meta.total);

      if (timetableRes && timetableRes.slots) {
        calculateCurrentSlot(timetableRes.slots);
      }

    } catch (err) {
      console.log('Failed to fetch dashboard stats', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [batchId, currentSemester]);

  useEffect(() => {
    fetchDashboardStats();

    // Set up an interval to check the current class every minute
    const intervalId = setInterval(() => {
      fetchDashboardStats(true);
    }, 60000);

    return () => clearInterval(intervalId);
  }, [fetchDashboardStats]);

  const calculateCurrentSlot = (slots: TimetableSlot[]) => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayStr = days[new Date().getDay()];

    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    const todaysSlots = slots.filter(s => s.day === todayStr);

    let foundSlot: TimetableSlot | null = null;

    for (const slot of todaysSlots) {
      const [startH, startM] = slot.startTime.split(':').map(Number);
      const [endH, endM] = slot.endTime.split(':').map(Number);

      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      if (currentTotalMinutes >= startTotal && currentTotalMinutes < endTotal) {
        foundSlot = slot;
        break;
      }
    }

    setCurrentSlot(foundSlot ? foundSlot : 'FREE');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardStats(true);
  };

  const renderCurrentSlotCard = () => {
    if (isLoading && !isRefreshing) {
      return (
        <View style={[styles.currentSlotCard, { justifyContent: 'center', height: 120 }]}>
          <ActivityIndicator size="small" color={COLORS.purple} />
        </View>
      );
    }

    const formatAMPM = (time24: string) => {
      if (!time24) return '';
      const [h, m] = time24.split(':');
      let hours = parseInt(h, 10);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${m} ${ampm}`;
    };

    if (!currentSlot || currentSlot === 'FREE') {
      return (
        <View style={[styles.currentSlotCard, { backgroundColor: COLORS.white }]}>
          <View style={styles.freePeriodBadge}>
            <Text style={styles.freePeriodBadgeTxt}>CURRENTLY</Text>
          </View>
          <Text style={styles.freePeriodTitle}>Free Period</Text>
          <Text style={styles.freePeriodDesc}>You don't have any ongoing class right now.</Text>
        </View>
      );
    }

    const isLunch = currentSlot.type === 'LUNCH';
    const isBreak = currentSlot.type === 'BREAK';

    if (isBreak || isLunch) {
      return (
        <View style={[styles.currentSlotCard, isLunch ? styles.lunchCard : styles.breakCard]}>
          <View style={[styles.freePeriodBadge, isLunch ? { backgroundColor: COLORS.orangeLight } : { backgroundColor: COLORS.white }]}>
            <Text style={[styles.freePeriodBadgeTxt, isLunch ? { color: COLORS.orange } : { color: COLORS.textSecondary }]}>
              HAPPENING NOW
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <ClockIcon width={20} height={20} fill={isLunch ? COLORS.lunchText : COLORS.breakText} />
            <Text style={[styles.breakTitle, isLunch && { color: COLORS.lunchText }]}>
              {formatAMPM(currentSlot.startTime)} - {formatAMPM(currentSlot.endTime)}
            </Text>
          </View>
          <Text style={[styles.breakTypeTxt, isLunch && { color: COLORS.lunchText }]}>
            {isLunch ? 'Lunch Break' : 'Short Break'}
          </Text>
        </View>
      );
    }

    // SUBJECT Slot
    return (
      <View style={styles.currentSlotCard}>
        <View style={styles.currentHeaderRow}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTxt}>LIVE NOW</Text>
          </View>
          <Text style={styles.timeTxt}>{formatAMPM(currentSlot.startTime)} - {formatAMPM(currentSlot.endTime)}</Text>
        </View>

        <Text style={styles.subjectNameTxt} numberOfLines={2}>
          {currentSlot.subject?.name || 'Unknown Subject'}
        </Text>

        <View style={styles.slotDetailsRow}>
          <View style={styles.slotTag}>
            <SubjectsIcon width={12} height={12} fill={COLORS.purple} />
            <Text style={styles.slotTagText}>{currentSlot.subject?.subjectCode}</Text>
          </View>
          {currentSlot.staff && (
            <View style={[styles.slotTag, { backgroundColor: COLORS.orangeLight }]}>
              <StudentsIcon width={12} height={12} fill={COLORS.orange} />
              <Text style={[styles.slotTagText, { color: COLORS.orange }]} numberOfLines={1}>
                {currentSlot.staff.name}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Abstract background shapes */}
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />

      {/* Premium Glassmorphism Header */}
      <View style={[styles.headerShadow, { marginTop: Math.max(insets.top, 10) + 10 }]}>
        <View style={styles.headerWrapper}>
          <BlurView style={styles.absoluteBlur} blurType="light" blurAmount={25} reducedTransparencyFallbackColor="white" />
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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.purple} colors={[COLORS.purple]} />}
      >

        {/* Current Class Card */}
        {renderCurrentSlotCard()}

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <TouchableOpacity
            style={styles.metricCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Students' as any)}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: COLORS.purpleLight }]}>
              <StudentsIcon width={24} height={24} fill={COLORS.purple} />
            </View>
            <Text style={styles.metricValue}>{isLoading && !isRefreshing ? '-' : totalStudents}</Text>
            <Text style={styles.metricLabel}>Total Students</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Subjects' as any)}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: COLORS.tealLight }]}>
              <SubjectsIcon width={24} height={24} fill={COLORS.teal} />
            </View>
            <Text style={styles.metricValue}>{isLoading && !isRefreshing ? '-' : totalSubjects}</Text>
            <Text style={styles.metricLabel}>Subjects for Sem {currentSemester || '-'}</Text>
          </TouchableOpacity>
        </View>

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
            <Text style={styles.actionDesc}>Manage your batch schedule</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('TutorHackathons')}
        >
          <View style={[styles.iconContainer, { backgroundColor: COLORS.orangeLight }]}>
            <Text style={{ fontSize: 24 }}>🏆</Text>
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Hackathons</Text>
            <Text style={styles.actionDesc}>Monitor participating teams</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('TutorEvents')}
        >
          <View style={[styles.iconContainer, { backgroundColor: COLORS.purpleLight }]}>
            <Text style={{ fontSize: 24 }}>📅</Text>
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Events</Text>
            <Text style={styles.actionDesc}>View college events</Text>
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
    backgroundColor: 'rgba(255, 159, 67, 0.15)',
  },
  bgBlob2: {
    position: 'absolute',
    top: 60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(46, 196, 182, 0.15)',
  },
  headerShadow: {
    marginHorizontal: 16,
    marginBottom: 16,
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
    top: 0, left: 0, bottom: 0, right: 0,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
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
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  currentSlotCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  breakCard: {
    backgroundColor: COLORS.breakBg,
    borderColor: COLORS.border,
  },
  lunchCard: {
    backgroundColor: COLORS.lunchBg,
    borderColor: COLORS.orangeLight,
  },
  currentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.danger,
    marginRight: 6,
  },
  liveTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.danger,
    letterSpacing: 0.5,
  },
  timeTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  subjectNameTxt: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  slotDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purpleLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  slotTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.purple,
    marginLeft: 6,
  },
  freePeriodBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  freePeriodBadgeTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  freePeriodTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  freePeriodDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  breakTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  breakTypeTxt: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.breakText,
    marginTop: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
    marginLeft: 4,
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
  },
});

export default TutorHomeScreen;
