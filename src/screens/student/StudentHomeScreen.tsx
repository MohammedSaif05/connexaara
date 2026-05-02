import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import NotificationIcon from '../../assets/svg/notification.svg';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
  emerald: '#10B981',
  orange: '#FF9F43',
  border: '#E2E8F0',
  inputBg: '#F8FAFC',
};

// --- Models & Mock Data (Ported from Tutor Dashboard) ---

interface Subject {
  id: string;
  name: string;
  code: string;
  semester: string;
}

interface PeriodEntry {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  type: 'Subject' | 'Break' | 'Lunch';
  subjectId?: string;
  staffId?: string;
}

const MOCK_STAFF = [
  { id: 's1', name: 'John Doe' },
  { id: 's2', name: 'Sarah Smith' },
  { id: 's3', name: 'Mike Ross' },
];

const INITIAL_SUBJECTS: Subject[] = [
  { id: 'sub1', name: 'Data Structures', code: 'CS301', semester: '3' },
  { id: 'sub2', name: 'Operating Systems', code: 'CS302', semester: '3' },
  { id: 'sub3', name: 'Machine Learning', code: 'CS501', semester: '5' },
];

const MOCK_STUDENT_TIMETABLE_ENTRIES: PeriodEntry[] = [
  { id: 'p1', day: 'Monday', startTime: '09:00 AM', endTime: '10:00 AM', type: 'Subject', subjectId: 'sub1', staffId: 's1' },
  { id: 'p2', day: 'Monday', startTime: '10:00 AM', endTime: '11:00 AM', type: 'Subject', subjectId: 'sub2', staffId: 's2' },
  { id: 'p3', day: 'Monday', startTime: '11:00 AM', endTime: '11:15 AM', type: 'Break' },
  { id: 'p4', day: 'Tuesday', startTime: '09:00 AM', endTime: '10:00 AM', type: 'Subject', subjectId: 'sub3', staffId: 's3' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const StudentHomeScreen = () => {
  const insets = useSafeAreaInsets();
  const [timetableModalVisible, setTimetableModalVisible] = useState(false);

  // Mocking current active period for the widget
  const currentPeriod = MOCK_STUDENT_TIMETABLE_ENTRIES[0];
  const currentSubject = INITIAL_SUBJECTS.find(s => s.id === currentPeriod.subjectId);
  const currentStaff = MOCK_STAFF.find(s => s.id === currentPeriod.staffId);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Abstract background shapes to refract through the glass */}
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
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
                  <Text style={styles.greetingText}>Alice Walker</Text>
                  <View style={styles.tagContainer}>
                    <Text style={styles.tagText}>STUDENT</Text>
                  </View>
                </View>
                <Text style={styles.deptText}>BTech CS • Semester 3</Text>
              </View>

              <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
                <NotificationIcon width={24} height={24} fill={COLORS.textPrimary} />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Dashboard Content */}
        <View style={styles.contentPadding}>
          
          <Text style={styles.sectionTitle}>Current Period</Text>
          
          {/* Current Period Card Widget */}
          <View style={styles.currentPeriodCard}>
            <View style={styles.periodHeader}>
              <View style={styles.liveIndicatorRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>HAPPENING NOW</Text>
              </View>
              <Text style={styles.periodTime}>{currentPeriod.startTime} - {currentPeriod.endTime}</Text>
            </View>
            <View style={styles.periodBody}>
              <Text style={styles.subjectTitle}>{currentSubject?.name || 'Unknown'}</Text>
              <View style={styles.periodMetaRow}>
                <Text style={styles.periodMetaText}>Code: {currentSubject?.code || 'N/A'}</Text>
                <Text style={styles.periodMetaDivider}>•</Text>
                <Text style={styles.periodMetaText}>Prof. {currentStaff?.name || 'Unassigned'}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Quick Access</Text>

          {/* Timetable Widget */}
          <TouchableOpacity 
            style={styles.actionCard} 
            activeOpacity={0.8}
            onPress={() => setTimetableModalVisible(true)}
          >
            <View style={styles.actionIconWrapper}>
              <Text style={styles.actionIcon}>📅</Text>
            </View>
            <View style={styles.actionTextWrapper}>
              <Text style={styles.actionTitle}>Weekly Timetable</Text>
              <Text style={styles.actionSubtitle}>View your complete schedule</Text>
            </View>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* ========================================================= */}
      {/* VIEW TIMETABLE MODAL (Ported from Tutor Dashboard) */}
      {/* ========================================================= */}
      <Modal
        visible={timetableModalVisible}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFullscreen, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Timetable</Text>
              <TouchableOpacity onPress={() => setTimetableModalVisible(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {DAYS.map(day => {
                const dayEntries = MOCK_STUDENT_TIMETABLE_ENTRIES.filter(e => e.day === day);
                if (dayEntries.length === 0) return null;

                return (
                  <View key={day} style={styles.dayGroupContainer}>
                    <Text style={styles.dayGroupHeader}>{day}</Text>
                    {dayEntries.map(entry => {
                      const subject = INITIAL_SUBJECTS.find(s => s.id === entry.subjectId);
                      const staff = MOCK_STAFF.find(s => s.id === entry.staffId);
                      return (
                        <View key={entry.id} style={styles.viewEntryCard}>
                          <View style={styles.viewTimeBox}>
                            <Text style={styles.viewTimeText}>{entry.startTime}</Text>
                            <Text style={styles.viewTimeDivider}>to</Text>
                            <Text style={styles.viewTimeText}>{entry.endTime}</Text>
                          </View>
                          <View style={styles.viewDetailsBox}>
                            {entry.type === 'Subject' ? (
                              <>
                                <Text style={styles.viewSubjectName}>{subject?.name || 'Unknown Subject'}</Text>
                                <Text style={styles.viewStaffName}>{staff?.name || 'Unassigned Staff'}</Text>
                              </>
                            ) : (
                              <Text style={styles.viewBreakName}>{entry.type}</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    backgroundColor: 'rgba(59, 130, 246, 0.15)', // Blue tint
  },
  bgBlob2: {
    position: 'absolute',
    top: 60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.15)', // Emerald tint
  },
  headerShadow: {
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: COLORS.blue,
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
    backgroundColor: COLORS.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.blue,
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
  contentPadding: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 10,
    marginBottom: 16,
  },
  currentPeriodCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.blueLight,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.emerald,
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.emerald,
    letterSpacing: 0.5,
  },
  periodTime: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  periodBody: {},
  subjectTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  periodMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodMetaText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  periodMetaDivider: {
    marginHorizontal: 8,
    color: COLORS.border,
  },
  actionCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  actionIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionTextWrapper: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  
  // Modal Styles (Ported)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  modalContentFullscreen: { backgroundColor: COLORS.white, flex: 1, paddingHorizontal: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  closeModalText: { fontSize: 20, fontWeight: '600', color: COLORS.textSecondary, padding: 4 },
  dayGroupContainer: { marginBottom: 24 },
  dayGroupHeader: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8 },
  viewEntryCard: { flexDirection: 'row', backgroundColor: COLORS.inputBg, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  viewTimeBox: { width: 90, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: COLORS.border, paddingRight: 10, marginRight: 10 },
  viewTimeText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  viewTimeDivider: { fontSize: 10, color: COLORS.textSecondary, marginVertical: 2 },
  viewDetailsBox: { flex: 1, justifyContent: 'center' },
  viewSubjectName: { fontSize: 15, fontWeight: '700', color: COLORS.blue, marginBottom: 4 },
  viewStaffName: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  viewBreakName: { fontSize: 15, fontWeight: '700', color: COLORS.orange, fontStyle: 'italic' },
});

export default StudentHomeScreen;
