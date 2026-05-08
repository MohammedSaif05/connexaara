import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useToast } from '../../components/ToastContext';
import { getTimetable, TimetableSlot, ApiError } from '../../services/api';
import { getAuthData } from '../../services/storage';

// Icons
import BackIcon from '../../assets/svg/back.svg'; // Assuming back icon exists
import CalendarIcon from '../../assets/svg/calendar.svg';
import ClockIcon from '../../assets/svg/clock.svg';
import SubjectIcon from '../../assets/svg/tutor-subjects.svg';
import BreakIcon from '../../assets/svg/not-found.svg'; // Fallback for break
import TeacherIcon from '../../assets/svg/tutor-profile.svg';
import NotFoundIcon from '../../assets/svg/not-found.svg';

const COLORS = {
  background: '#F5F7FA',
  white: '#FFFFFF',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  textTertiary: '#C4C9D4',
  primary: '#7B61FF',
  primaryLight: '#F0EDFF',
  teal: '#2EC4B6',
  tealLight: '#E6FAF8',
  orange: '#FF9F43',
  orangeLight: '#FFF0E1',
  border: '#E8EBF0',
  breakBg: '#F3F4F6',
  breakText: '#9CA3AF',
};

// Grouping helper
const DAYS_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const TutorTimetableScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();

  const [currentSemester, setCurrentSemester] = useState<number | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load auth data
  useEffect(() => {
    getAuthData().then(auth => {
      if (auth?.batchId) setBatchId(auth.batchId);
      if (auth?.currentSemester) {
        setCurrentSemester(auth.currentSemester);
        setSelectedSemester(auth.currentSemester);
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  // Fetch timetable
  const fetchTimetable = useCallback(async (sem: number, bid: string, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await getTimetable(bid, sem);
      setSlots(res.slots || []);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load timetable.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (batchId && selectedSemester) {
      fetchTimetable(selectedSemester, batchId);
    }
  }, [selectedSemester, batchId, fetchTimetable]);

  const handleRefresh = () => {
    if (!batchId || !selectedSemester) return;
    setIsRefreshing(true);
    fetchTimetable(selectedSemester, batchId, true);
  };

  // Group slots by day
  const groupedSlots = React.useMemo(() => {
    const groups: Record<string, TimetableSlot[]> = {};
    DAYS_ORDER.forEach(day => {
      const daySlots = slots.filter(s => s.day === day);
      if (daySlots.length > 0) {
        // Sort by start time (simple string compare works for HH:mm)
        daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
        groups[day] = daySlots;
      }
    });
    return groups;
  }, [slots]);

  // Semester pills
  const renderSemesterSelector = () => {
    if (!currentSemester) return null;
    const semesters = Array.from({ length: currentSemester }, (_, i) => currentSemester - i);
    
    return (
      <View style={styles.semesterContainer}>
        <Text style={styles.semesterLabel}>Select Semester</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.semesterScroll}>
          {semesters.map(sem => (
            <TouchableOpacity
              key={sem}
              activeOpacity={0.7}
              onPress={() => setSelectedSemester(sem)}
              style={[
                styles.semesterPill,
                selectedSemester === sem && styles.semesterPillActive
              ]}
            >
              <Text style={[
                styles.semesterPillText,
                selectedSemester === sem && styles.semesterPillTextActive
              ]}>
                Semester {sem}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render individual slot
  const renderSlot = (slot: TimetableSlot) => {
    const isBreak = slot.type === 'BREAK';
    
    if (isBreak) {
      return (
        <View key={slot.id} style={styles.breakCard}>
          <ClockIcon width={14} height={14} fill={COLORS.breakText} />
          <Text style={styles.breakTimeText}>{slot.startTime} - {slot.endTime}</Text>
          <View style={styles.breakDivider} />
          <Text style={styles.breakText}>BREAK</Text>
        </View>
      );
    }

    return (
      <View key={slot.id} style={styles.slotCard}>
        <View style={styles.slotTimeCol}>
          <Text style={styles.slotStartTime}>{slot.startTime}</Text>
          <View style={styles.slotTimeLine} />
          <Text style={styles.slotEndTime}>{slot.endTime}</Text>
        </View>
        
        <View style={styles.slotContent}>
          <Text style={styles.slotSubjectName} numberOfLines={2}>
            {slot.subject?.name || 'Unknown Subject'}
          </Text>
          <View style={styles.slotDetailsRow}>
            <View style={styles.slotTag}>
              <SubjectIcon width={12} height={12} fill={COLORS.primary} />
              <Text style={styles.slotTagText}>{slot.subject?.subjectCode}</Text>
            </View>
            <View style={[styles.slotTag, { backgroundColor: COLORS.orangeLight }]}>
              <TeacherIcon width={12} height={12} fill={COLORS.orange} />
              <Text style={[styles.slotTagText, { color: COLORS.orange }]} numberOfLines={1}>
                {slot.staff?.name || 'TBA'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <BackIcon width={24} height={24} fill={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Class Timetable</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {renderSemesterSelector()}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading timetable...</Text>
          </View>
        ) : slots.length === 0 ? (
          <View style={styles.centerWrap}>
            <NotFoundIcon width={100} height={100} />
            <Text style={styles.emptyTitle}>No Classes Scheduled</Text>
            <Text style={styles.emptyDesc}>There are no timetable slots for this semester.</Text>
          </View>
        ) : (
          DAYS_ORDER.map(day => {
            const daySlots = groupedSlots[day];
            if (!daySlots) return null;
            
            return (
              <View key={day} style={styles.dayGroup}>
                <View style={styles.dayHeader}>
                  <CalendarIcon width={18} height={18} fill={COLORS.teal} />
                  <Text style={styles.dayTitle}>{day}</Text>
                </View>
                <View style={styles.slotsContainer}>
                  {daySlots.map(renderSlot)}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  semesterContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  semesterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 20,
    marginBottom: 8,
  },
  semesterScroll: {
    paddingHorizontal: 16,
  },
  semesterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  semesterPillActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  semesterPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  semesterPillTextActive: {
    color: COLORS.primary,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  dayGroup: {
    marginBottom: 24,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  slotsContainer: {
    gap: 10,
  },
  slotCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slotTimeCol: {
    width: 65,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  slotStartTime: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  slotTimeLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    marginVertical: 4,
    borderRadius: 1,
  },
  slotEndTime: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  slotContent: {
    flex: 1,
    paddingLeft: 14,
    justifyContent: 'center',
  },
  slotSubjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  slotDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  slotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  slotTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 4,
  },
  breakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.breakBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  breakTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  breakDivider: {
    height: 4,
    width: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textTertiary,
    marginHorizontal: 10,
  },
  breakText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
});

export default TutorTimetableScreen;
