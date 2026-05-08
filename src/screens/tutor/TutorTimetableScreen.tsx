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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useToast } from '../../components/ToastContext';
import { getTimetable, updateTimetable, getSubjects, TimetableSlot, ApiError } from '../../services/api';
import { getAuthData } from '../../services/storage';

// Icons
import BackIcon from '../../assets/svg/back.svg'; 
import CalendarIcon from '../../assets/svg/calendar.svg';
import ClockIcon from '../../assets/svg/clock.svg';
import SubjectIcon from '../../assets/svg/tutor-subjects.svg';
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
  danger: '#FF4757',
  dangerLight: '#FFE5E7',
  border: '#E8EBF0',
  breakBg: '#F3F4F6',
  breakText: '#9CA3AF',
  lunchBg: '#FFF4E5',
  lunchText: '#B26A00',
};

const DAYS_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

// Internal Type for drafting slots (some may lack IDs yet)
type DraftSlot = {
  tempId: string; // Used for local keying
  day: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  startTime: string;
  endTime: string;
  type: 'SUBJECT' | 'BREAK' | 'LUNCH';
  subject?: { id: string; name: string; subjectCode: string } | null;
  staff?: { id: string; name: string } | null;
};

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

  // Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [draftSlots, setDraftSlots] = useState<DraftSlot[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Add Slot Modal
  const [addVisible, setAddVisible] = useState(false);
  const [newDay, setNewDay] = useState<'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'>('MONDAY');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newType, setNewType] = useState<'SUBJECT' | 'BREAK' | 'LUNCH'>('SUBJECT');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [subjectList, setSubjectList] = useState<any[]>([]);

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
      setIsEditing(false); // Reset edit mode on semester change
    }
  }, [selectedSemester, batchId, fetchTimetable]);

  const handleRefresh = () => {
    if (!batchId || !selectedSemester || isEditing) return;
    setIsRefreshing(true);
    fetchTimetable(selectedSemester, batchId, true);
  };

  const handleStartEdit = () => {
    const drafts = slots.map(s => ({
      tempId: s.id,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      type: s.type,
      subject: s.subject,
      staff: s.staff,
    }));
    setDraftSlots(drafts);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    Alert.alert('Discard Changes?', 'Any added or deleted slots will be lost.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => setIsEditing(false) },
    ]);
  };

  const openAddModal = async () => {
    setAddVisible(true);
    setNewDay('MONDAY'); setNewStartTime(''); setNewEndTime(''); setNewType('SUBJECT'); setNewSubjectId('');
    try {
      if (selectedSemester) {
        const subRes = await getSubjects(1, 100, '', selectedSemester);
        setSubjectList(subRes.data);
      }
    } catch (err) {
      showToast('Failed to load subjects', 'error');
    }
  };

  const handleAddDraftSlot = () => {
    if (!newStartTime.trim() || !newEndTime.trim()) {
      showToast('Start and End times are required', 'error');
      return;
    }
    if (newType === 'SUBJECT' && !newSubjectId) {
      showToast('Subject is required', 'error');
      return;
    }

    const selectedSub = subjectList.find(s => s.id === newSubjectId);

    const newDraft: DraftSlot = {
      tempId: Date.now().toString(),
      day: newDay,
      startTime: newStartTime.trim(),
      endTime: newEndTime.trim(),
      type: newType,
      subject: newType === 'SUBJECT' && selectedSub ? {
        id: selectedSub.id,
        name: selectedSub.name,
        subjectCode: selectedSub.subjectCode,
      } : null,
      staff: null, // Staff will be resolved by backend!
    };

    setDraftSlots(prev => [...prev, newDraft]);
    setAddVisible(false);
  };

  const handleDeleteDraft = (tempId: string) => {
    setDraftSlots(prev => prev.filter(s => s.tempId !== tempId));
  };

  const handleSaveTimetable = async () => {
    if (!batchId || !selectedSemester) return;
    setIsSaving(true);
    try {
      const payloadSlots = draftSlots.map(d => ({
        day: d.day,
        startTime: d.startTime,
        endTime: d.endTime,
        type: d.type,
        ...(d.type === 'SUBJECT' && d.subject ? { subjectId: d.subject.id } : {}),
        // We do NOT send staffId; the backend handles it.
      }));

      await updateTimetable({
        batchId,
        semester: selectedSemester,
        slots: payloadSlots,
      });

      showToast('Timetable saved successfully!', 'success');
      setIsEditing(false);
      fetchTimetable(selectedSemester, batchId, true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to save timetable.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Group slots by day
  const displaySlots = isEditing ? draftSlots : slots;
  
  const groupedSlots = React.useMemo(() => {
    const groups: Record<string, (TimetableSlot | DraftSlot)[]> = {};
    DAYS_ORDER.forEach(day => {
      const daySlots = displaySlots.filter(s => s.day === day);
      if (daySlots.length > 0) {
        daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
        groups[day] = daySlots;
      }
    });
    return groups;
  }, [displaySlots]);

  const renderSemesterSelector = () => {
    if (!currentSemester) return null;
    const semesters = Array.from({ length: currentSemester }, (_, i) => currentSemester - i);
    
    return (
      <View style={styles.semesterContainer}>
        <Text style={styles.semesterLabel}>Select Semester</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.semesterScroll} pointerEvents={isEditing ? 'none' : 'auto'}>
          {semesters.map(sem => (
            <TouchableOpacity
              key={sem}
              activeOpacity={0.7}
              onPress={() => setSelectedSemester(sem)}
              style={[
                styles.semesterPill,
                selectedSemester === sem && styles.semesterPillActive,
                isEditing && { opacity: 0.5 }
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

  const renderSlot = (slot: TimetableSlot | DraftSlot) => {
    const id = 'tempId' in slot ? slot.tempId : slot.id;
    const isLunch = slot.type === 'LUNCH';
    const isBreak = slot.type === 'BREAK';

    let cardContent;

    if (isBreak || isLunch) {
      cardContent = (
        <View style={[styles.breakCard, isLunch && { backgroundColor: COLORS.lunchBg, borderColor: COLORS.orangeLight }]}>
          <ClockIcon width={14} height={14} fill={isLunch ? COLORS.lunchText : COLORS.breakText} />
          <Text style={[styles.breakTimeText, isLunch && { color: COLORS.lunchText }]}>{slot.startTime} - {slot.endTime}</Text>
          <View style={[styles.breakDivider, isLunch && { backgroundColor: COLORS.lunchText }]} />
          <Text style={[styles.breakText, isLunch && { color: COLORS.lunchText }]}>{isLunch ? 'LUNCH' : 'BREAK'}</Text>
          
          {isEditing && (
            <TouchableOpacity style={styles.deleteSlotBtn} onPress={() => handleDeleteDraft(id)}>
              <Text style={styles.deleteSlotTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    } else {
      cardContent = (
        <View style={styles.slotCard}>
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
              {slot.staff && (
                <View style={[styles.slotTag, { backgroundColor: COLORS.orangeLight }]}>
                  <TeacherIcon width={12} height={12} fill={COLORS.orange} />
                  <Text style={[styles.slotTagText, { color: COLORS.orange }]} numberOfLines={1}>
                    {slot.staff.name}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {isEditing && (
            <TouchableOpacity style={styles.deleteSlotBtn} onPress={() => handleDeleteDraft(id)}>
              <Text style={styles.deleteSlotTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View key={id}>
        {cardContent}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        {!isEditing ? (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <BackIcon width={24} height={24} fill={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Class Timetable</Text>
            </View>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.85} onPress={handleStartEdit}>
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={handleCancelEdit}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Editing Schedule</Text>
            </View>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.primary }]} onPress={handleSaveTimetable} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={[styles.actionButtonText, { color: COLORS.white }]}>Save</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>

      {renderSemesterSelector()}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={!isEditing ? <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} /> : undefined}
      >
        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading timetable...</Text>
          </View>
        ) : displaySlots.length === 0 ? (
          <View style={styles.centerWrap}>
            <NotFoundIcon width={100} height={100} />
            <Text style={styles.emptyTitle}>{isEditing ? 'Draft is Empty' : 'No Classes Scheduled'}</Text>
            <Text style={styles.emptyDesc}>{isEditing ? 'Tap the + button below to add slots.' : 'There are no timetable slots for this semester.'}</Text>
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
        
        {/* Extra padding for FAB */}
        {isEditing && <View style={{ height: 80 }} />}
      </ScrollView>

      {/* Floating Add Button for Edit Mode */}
      {isEditing && (
        <TouchableOpacity style={[styles.fab, { bottom: Math.max(insets.bottom, 20) }]} activeOpacity={0.8} onPress={openAddModal}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Add Slot Modal */}
      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Add Slot to Draft</Text>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setAddVisible(false)}>
                    <Text style={styles.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.inputLabel}>Slot Type</Text>
                  <View style={styles.typeRow}>
                    {['SUBJECT', 'BREAK', 'LUNCH'].map(t => (
                      <TouchableOpacity key={t} style={[styles.typeBtn, newType === t && styles.typeBtnActive]} onPress={() => setNewType(t as any)}>
                        <Text style={[styles.typeBtnTxt, newType === t && styles.typeBtnTxtActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Day</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    {DAYS_ORDER.map(d => (
                      <TouchableOpacity key={d} style={[styles.dayBtn, newDay === d && styles.typeBtnActive]} onPress={() => setNewDay(d as any)}>
                        <Text style={[styles.typeBtnTxt, newDay === d && styles.typeBtnTxtActive]}>{d.slice(0, 3)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={styles.timeRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Start Time</Text>
                      <TextInput style={styles.formInput} placeholder="09:00" placeholderTextColor={COLORS.textTertiary} value={newStartTime} onChangeText={setNewStartTime} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>End Time</Text>
                      <TextInput style={styles.formInput} placeholder="10:00" placeholderTextColor={COLORS.textTertiary} value={newEndTime} onChangeText={setNewEndTime} />
                    </View>
                  </View>

                  {newType === 'SUBJECT' && (
                    <>
                      <Text style={styles.inputLabel}>Subject</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        {subjectList.map(sub => (
                          <TouchableOpacity key={sub.id} style={[styles.subBtn, newSubjectId === sub.id && styles.typeBtnActive]} onPress={() => setNewSubjectId(sub.id)}>
                            <Text style={[styles.typeBtnTxt, newSubjectId === sub.id && styles.typeBtnTxtActive]}>{sub.subjectCode}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <Text style={styles.helperText}>* Staff member will be automatically assigned upon saving based on Subject Assignments.</Text>
                    </>
                  )}
                </ScrollView>

                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleAddDraftSlot}>
                    <Text style={styles.saveBtnText}>Add to Draft</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
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
    width: 60,
    height: 40,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
  actionButton: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
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
    paddingRight: 24,
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
  deleteSlotBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteSlotTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.danger,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.white,
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseTxt: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  typeBtnTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeBtnTxtActive: {
    color: COLORS.primary,
  },
  dayBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  formInput: {
    height: 48,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  formActions: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default TutorTimetableScreen;
