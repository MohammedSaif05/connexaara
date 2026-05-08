import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, Modal, RefreshControl, ActivityIndicator, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import NotificationIcon from '../../assets/svg/notification.svg';
import { getAuthData } from '../../services/storage';
import { getTimetable, getSubjects, getSubjectById, TimetableSlot, SubjectListItem, SubjectDetail } from '../../services/api';

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

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const StudentHomeScreen = () => {
  const insets = useSafeAreaInsets();
  const [timetableModalVisible, setTimetableModalVisible] = useState(false);
  const [userName, setUserName] = useState('');
  const [deptName, setDeptName] = useState('');
  const [batchName, setBatchName] = useState('');
  const [batchId, setBatchId] = useState<string | null>(null);
  const [currentSemester, setCurrentSemester] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [subjects, setSubjects] = useState<SubjectListItem[]>([]);
  const [currentSlot, setCurrentSlot] = useState<TimetableSlot | 'FREE' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Subject Detail Modal State
  const [subjectDetailVisible, setSubjectDetailVisible] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectDetail | null>(null);

  useEffect(() => {
    getAuthData().then(data => {
      if (data) {
        setUserName(data.name);
        setDeptName(data.departmentName);
        if (data.batchName) setBatchName(data.batchName);
        if (data.batchId) setBatchId(data.batchId);
        if (data.currentSemester) setCurrentSemester(data.currentSemester);
      }
    });
  }, []);

  const fetchDashboardData = async (silent = false) => {
    if (!batchId || !currentSemester) return;
    if (!silent) setIsLoading(true);
    try {
      const [ttRes, subRes] = await Promise.all([
        getTimetable(batchId, currentSemester).catch(() => null),
        getSubjects(1, 20, '', currentSemester).catch(() => null),
      ]);
      
      if (ttRes && ttRes.slots) {
        setTimetableSlots(ttRes.slots);
        calculateCurrentSlot(ttRes.slots);
      }
      
      if (subRes && subRes.data) {
        setSubjects(subRes.data);
      }
    } catch (err) {
      console.log('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData(true);
  };

  const handleViewSubject = async (id: string) => {
    setSubjectDetailVisible(true);
    setIsDetailLoading(true);
    setSelectedSubject(null);
    try {
      const detail = await getSubjectById(id);
      setSelectedSubject(detail);
    } catch (err) {
      console.log('Failed to load subject details:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const intervalId = setInterval(() => fetchDashboardData(true), 60000);
    return () => clearInterval(intervalId);
  }, [batchId, currentSemester]);

  const calculateCurrentSlot = (slots: TimetableSlot[]) => {
    const daysArr = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayStr = daysArr[new Date().getDay()];

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

  const formatAMPM = (time24: string) => {
    if (!time24) return '';
    const [h, m] = time24.split(':');
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${m} ${ampm}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Abstract background shapes to refract through the glass */}
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.blue]}
            tintColor={COLORS.blue}
          />
        }
      >
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
                    <Text style={styles.tagText}>STUDENT</Text>
                  </View>
                </View>
                <Text style={styles.deptText}>
                  {deptName ? `${deptName}${batchName ? ` • ${batchName}` : ''}` : batchName || '—'}
                </Text>
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
          {isLoading ? (
            <View style={[styles.currentPeriodCard, { justifyContent: 'center', alignItems: 'center', height: 120 }]}>
              <Text style={{ color: COLORS.textSecondary }}>Loading...</Text>
            </View>
          ) : !currentSlot || currentSlot === 'FREE' ? (
            <View style={styles.currentPeriodCard}>
              <View style={styles.periodHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.liveIndicatorRow, { backgroundColor: COLORS.border }]}>
                    <Text style={[styles.liveText, { color: COLORS.textSecondary }]}>CURRENTLY</Text>
                  </View>
                  {currentSemester && (
                    <View style={[styles.tagContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                      <Text style={[styles.tagText, { color: COLORS.emerald }]}>SEM {currentSemester}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.periodBody}>
                <Text style={styles.subjectTitle}>Free Period 🎉</Text>
                <Text style={styles.periodMetaText}>Take a break or prepare for the next class.</Text>
              </View>
            </View>
          ) : (
            <View style={styles.currentPeriodCard}>
              <View style={styles.periodHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.liveIndicatorRow}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>HAPPENING NOW</Text>
                  </View>
                  {currentSemester && (
                    <View style={[styles.tagContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                      <Text style={[styles.tagText, { color: COLORS.emerald }]}>SEM {currentSemester}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.periodTime}>{formatAMPM(currentSlot.startTime)} - {formatAMPM(currentSlot.endTime)}</Text>
              </View>
              <View style={styles.periodBody}>
                {currentSlot.type === 'SUBJECT' ? (
                  <>
                    <Text style={styles.subjectTitle}>{currentSlot.subject?.name || 'Unknown'}</Text>
                    <View style={styles.periodMetaRow}>
                      <Text style={styles.periodMetaText}>Code: {currentSlot.subject?.subjectCode || 'N/A'}</Text>
                      <Text style={styles.periodMetaDivider}>•</Text>
                      <Text style={styles.periodMetaText}>Prof. {currentSlot.staff?.name || 'Unassigned'}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.subjectTitle}>{currentSlot.type === 'LUNCH' ? 'Lunch Break 🍔' : 'Break Time ☕'}</Text>
                )}
              </View>
            </View>
          )}

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

          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionTitle}>My Subjects</Text>
            {isLoading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color={COLORS.blue} />
            ) : subjects.length > 0 ? (
              subjects.map(sub => (
                <TouchableOpacity 
                  key={sub.id} 
                  style={styles.subjectCard} 
                  activeOpacity={0.7}
                  onPress={() => handleViewSubject(sub.id)}
                >
                  <View style={styles.subjectIconWrap}>
                    <Text style={styles.subjectIconTxt}>{sub.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.subjectCardBody}>
                    <Text style={styles.subjectCardName} numberOfLines={1}>{sub.name}</Text>
                    <Text style={styles.subjectCardCode}>{sub.subjectCode} • Sem {sub.semester}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ color: COLORS.textSecondary, textAlign: 'center', marginVertical: 20 }}>
                No subjects assigned for this semester.
              </Text>
            )}
          </View>

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
                const dayEntries = timetableSlots.filter(e => e.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
                if (dayEntries.length === 0) return null;

                return (
                  <View key={day} style={styles.dayGroupContainer}>
                    <Text style={styles.dayGroupHeader}>{day}</Text>
                    {dayEntries.map(entry => {
                      return (
                        <View key={entry.id} style={styles.viewEntryCard}>
                          <View style={styles.viewTimeBox}>
                            <Text style={styles.viewTimeText}>{formatAMPM(entry.startTime)}</Text>
                            <Text style={styles.viewTimeDivider}>to</Text>
                            <Text style={styles.viewTimeText}>{formatAMPM(entry.endTime)}</Text>
                          </View>
                          <View style={styles.viewDetailsBox}>
                            {entry.type === 'SUBJECT' ? (
                              <>
                                <Text style={styles.viewSubjectName}>{entry.subject?.name || 'Unknown Subject'}</Text>
                                <Text style={styles.viewStaffName}>{entry.staff?.name || 'Unassigned Staff'}</Text>
                              </>
                            ) : (
                              <Text style={styles.viewBreakName}>{entry.type === 'LUNCH' ? 'Lunch Break' : 'Break'}</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
              {timetableSlots.length === 0 && !isLoading && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <Text style={{ color: COLORS.textSecondary }}>No timetable found for this semester.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* VIEW SUBJECT DETAILS MODAL */}
      {/* ========================================================= */}
      <Modal
        visible={subjectDetailVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setSubjectDetailVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSubjectDetailVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                {isDetailLoading ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <ActivityIndicator color={COLORS.blue} size="large" />
                    <Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>Loading Details...</Text>
                  </View>
                ) : selectedSubject ? (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                    {/* Header */}
                    <View style={styles.modalHeaderRow}>
                      <Text style={styles.modalTitle}>Subject Details</Text>
                      <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSubjectDetailVisible(false)}>
                        <Text style={styles.modalCloseTxt}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Avatar */}
                    <View style={{ alignItems: 'center', marginBottom: 16 }}>
                      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 28, fontWeight: 'bold', color: COLORS.blue }}>
                          {selectedSubject.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.detailName}>{selectedSubject.name}</Text>
                    <Text style={styles.detailSub}>{selectedSubject.subjectCode}</Text>

                    {/* Info card */}
                    <View style={styles.infoCard}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Semester</Text>
                        <Text style={styles.infoValue}>Sem {selectedSubject.semester}</Text>
                      </View>
                      <View style={styles.infoRowDivider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Department</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{selectedSubject.department.name}</Text>
                      </View>
                    </View>

                    {/* Assignments */}
                    {selectedSubject.assignments.length > 0 && (
                      <View style={{ marginTop: 16 }}>
                        <Text style={styles.sectionTitle}>Teaching Staff</Text>
                        {selectedSubject.assignments.filter(a => !batchName || a.batch.name === batchName).map((a) => (
                          <View key={a.id} style={styles.infoCard}>
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>Professor</Text>
                              <Text style={styles.infoValue}>
                                {a.staff ? a.staff.name : 'Not Assigned'}
                              </Text>
                            </View>
                            {a.staff?.email && (
                              <>
                                <View style={styles.infoRowDivider} />
                                <View style={styles.infoRow}>
                                  <Text style={styles.infoLabel}>Email</Text>
                                  <Text style={styles.infoValue} numberOfLines={1}>{a.staff.email}</Text>
                                </View>
                              </>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </ScrollView>
                ) : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  
  // Subject Card Styles
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.blueLight,
  },
  subjectIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  subjectIconTxt: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.blue,
  },
  subjectCardBody: {
    flex: 1,
  },
  subjectCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subjectCardCode: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Modal Styles (Ported)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  modalContentFullscreen: { backgroundColor: COLORS.white, flex: 1, paddingHorizontal: 24 },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseTxt: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
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
  // Modal Details Styles
  detailName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  detailSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  infoRowDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
});

export default StudentHomeScreen;
