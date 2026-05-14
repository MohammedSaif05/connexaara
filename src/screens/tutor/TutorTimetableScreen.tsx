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
import Skeleton from '../../components/Skeleton';

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
  const [selectedDays, setSelectedDays] = useState<string[]>(['MONDAY']);
  
  const [startHH, setStartHH] = useState('');
  const [startMM, setStartMM] = useState('');
  const [startAMPM, setStartAMPM] = useState<'AM' | 'PM'>('AM');

  const [endHH, setEndHH] = useState('');
  const [endMM, setEndMM] = useState('');
  const [endAMPM, setEndAMPM] = useState<'AM' | 'PM'>('AM');
  
  const [newType, setNewType] = useState<'SUBJECT' | 'BREAK' | 'LUNCH'>('SUBJECT');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [subjectList, setSubjectList] = useState<any[]>([]);

  const [cancelVisible, setCancelVisible] = useState(false);

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
    fetchTimetable(selectedSemester, batchId);
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
    setCancelVisible(true);
  };

  const openAddModal = async () => {
    setAddVisible(true);
    setSelectedDays(['MONDAY']); 
    setStartHH(''); setStartMM(''); setStartAMPM('AM');
    setEndHH(''); setEndMM(''); setEndAMPM('AM');
    setNewType('SUBJECT'); setNewSubjectId('');
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
    const formatTo24H = (hh: string, mm: string, ampm: 'AM'|'PM') => {
      let h = parseInt(hh, 10) || 0;
      let m = parseInt(mm, 10) || 0;
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    if (!startHH || !startMM || !endHH || !endMM) {
      showToast('Start and End times are required', 'error');
      return;
    }

    const newStartTime = formatTo24H(startHH, startMM, startAMPM);
    const newEndTime = formatTo24H(endHH, endMM, endAMPM);

    if (newType === 'SUBJECT' && !newSubjectId) {
      showToast('Subject is required', 'error');
      return;
    }

    const selectedSub = subjectList.find(s => s.id === newSubjectId);

    const newSlots: DraftSlot[] = selectedDays.map(day => ({
      tempId: Date.now().toString() + Math.random().toString(36).substring(7),
      day: day as any,
      startTime: newStartTime.trim(),
      endTime: newEndTime.trim(),
      type: newType,
      subject: newType === 'SUBJECT' && selectedSub ? {
        id: selectedSub.id,
        name: selectedSub.name,
        subjectCode: selectedSub.subjectCode,
      } : null,
      staff: null, // Staff will be resolved by backend!
    }));

    setDraftSlots(prev => [...prev, ...newSlots]);
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
          <View style={styles.slotsContainer}>
            {[1, 2, 3].map((_, index) => (
              <View key={index} style={styles.slotCard}>
                <View style={styles.slotTimeCol}>
                  <Skeleton width={36} height={14} style={{ marginBottom: 4 }} />
                  <View style={styles.slotTimeLine} />
                  <Skeleton width={36} height={14} style={{ marginTop: 4 }} />
                </View>
                <View style={styles.slotContent}>
                  <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
                  <View style={styles.slotDetailsRow}>
                    <Skeleton width={60} height={20} borderRadius={6} />
                    <Skeleton width={80} height={20} borderRadius={6} />
                  </View>
                </View>
              </View>
            ))}
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

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Days</Text>
                    {(newType === 'BREAK' || newType === 'LUNCH') && (
                      <TouchableOpacity onPress={() => setSelectedDays(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'])}>
                        <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '600' }}>Select Mon-Sat</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    {DAYS_ORDER.map(d => {
                      const isSelected = selectedDays.includes(d);
                      return (
                        <TouchableOpacity 
                          key={d} 
                          style={[styles.dayBtn, isSelected && styles.typeBtnActive]} 
                          onPress={() => {
                            if (isSelected) {
                              if (selectedDays.length > 1) {
                                setSelectedDays(prev => prev.filter(day => day !== d));
                              }
                            } else {
                              setSelectedDays(prev => [...prev, d]);
                            }
                          }}
                        >
                          <Text style={[styles.typeBtnTxt, isSelected && styles.typeBtnTxtActive]}>{d.slice(0, 3)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.timeRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Start Time</Text>
                      <View style={styles.timeInputWrapper}>
                        <TextInput style={styles.timePartInput} placeholder="10" placeholderTextColor={COLORS.textTertiary} keyboardType="numeric" maxLength={2} value={startHH} onChangeText={setStartHH} />
                        <Text style={styles.timeColon}>:</Text>
                        <TextInput style={styles.timePartInput} placeholder="00" placeholderTextColor={COLORS.textTertiary} keyboardType="numeric" maxLength={2} value={startMM} onChangeText={setStartMM} />
                        <TouchableOpacity style={styles.ampmBtn} onPress={() => setStartAMPM(prev => prev === 'AM' ? 'PM' : 'AM')}>
                          <Text style={styles.ampmTxt}>{startAMPM}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ width: 16 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>End Time</Text>
                      <View style={styles.timeInputWrapper}>
                        <TextInput style={styles.timePartInput} placeholder="11" placeholderTextColor={COLORS.textTertiary} keyboardType="numeric" maxLength={2} value={endHH} onChangeText={setEndHH} />
                        <Text style={styles.timeColon}>:</Text>
                        <TextInput style={styles.timePartInput} placeholder="30" placeholderTextColor={COLORS.textTertiary} keyboardType="numeric" maxLength={2} value={endMM} onChangeText={setEndMM} />
                        <TouchableOpacity style={styles.ampmBtn} onPress={() => setEndAMPM(prev => prev === 'AM' ? 'PM' : 'AM')}>
                          <Text style={styles.ampmTxt}>{endAMPM}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {newType === 'SUBJECT' && (
                    <>
                      <Text style={styles.inputLabel}>Subject</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        {subjectList.map(sub => (
                          <TouchableOpacity key={sub.id} style={[styles.subBtn, newSubjectId === sub.id && styles.typeBtnActive]} onPress={() => setNewSubjectId(sub.id)}>
                            <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                              <Text style={[styles.typeBtnTxt, newSubjectId === sub.id && styles.typeBtnTxtActive]}>{sub.subjectCode} - {sub.name}</Text>
                              {(() => {
                                const assignedStaff = sub.assignments?.find((a: any) => a.batchId === batchId)?.staff?.name;
                                if (assignedStaff) {
                                  return <Text style={{ fontSize: 10, color: newSubjectId === sub.id ? COLORS.primary : COLORS.textSecondary, marginTop: 4 }}>{assignedStaff}</Text>;
                                }
                                return null;
                              })()}
                            </View>
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

      {/* Cancel Alert Modal */}
      <Modal visible={cancelVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={styles.alertIconWrap}>
              <Text style={{ fontSize: 24 }}>⚠️</Text>
            </View>
            <Text style={styles.alertTitle}>Discard Changes?</Text>
            <Text style={styles.alertDesc}>Any added or deleted slots will be lost. Are you sure you want to cancel editing?</Text>
            <View style={styles.alertActions}>
              <TouchableOpacity style={styles.alertCancelBtn} onPress={() => setCancelVisible(false)}>
                <Text style={styles.alertCancelTxt}>Keep Editing</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.alertConfirmBtn} onPress={() => { setCancelVisible(false); setIsEditing(false); }}>
                <Text style={styles.alertConfirmTxt}>Discard</Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: 20,
    alignItems: 'center',
  },
  timeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 48,
    paddingHorizontal: 8,
  },
  timePartInput: {
    fontSize: 15,
    color: COLORS.textPrimary,
    textAlign: 'center',
    minWidth: 28,
  },
  timeColon: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginHorizontal: 4,
  },
  ampmBtn: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ampmTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
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
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  alertIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  alertDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  alertCancelBtn: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCancelTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  alertConfirmBtn: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertConfirmTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default TutorTimetableScreen;
