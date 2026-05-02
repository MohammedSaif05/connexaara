import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/ToastContext';
import ViewIcon from '../../assets/svg/view.svg';

const COLORS = {
  background: '#F5F7FA',
  white: '#FFFFFF',
  textPrimary: '#1B2A4A',
  textSecondary: '#7A869A',
  primary: '#2EC4B6',
  purple: '#6C5CE7',
  purpleLight: '#F0EFFF',
  orange: '#FF9F43',
  orangeLight: '#FFF0E1',
  border: '#E2E8F0',
  inputBg: '#F8FAFC',
};

// --- Models & Mock Data ---

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

interface Timetable {
  id: string;
  semester: string;
  entries: PeriodEntry[];
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

const INITIAL_TIMETABLES: Timetable[] = [
  {
    id: 'tt1',
    semester: '3',
    entries: [
      { id: 'p1', day: 'Monday', startTime: '09:00 AM', endTime: '10:00 AM', type: 'Subject', subjectId: 'sub1', staffId: 's1' },
    ],
  },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIOD_TYPES = ['Subject', 'Break', 'Lunch'];

// --- Main Component ---

const TutorSubjectsScreen = () => {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'Subjects' | 'TimeTable'>('Subjects');

  // Lists State
  const [subjectsList, setSubjectsList] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [timetablesList, setTimetablesList] = useState<Timetable[]>(INITIAL_TIMETABLES);

  // Modals Visibility
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [timetableModalVisible, setTimetableModalVisible] = useState(false);
  const [viewTimetableModalVisible, setViewTimetableModalVisible] = useState(false);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);

  // Keyboard Padding (Android Fix)
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'ios') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardPadding(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardPadding(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // --- Subject Form State ---
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubSem, setNewSubSem] = useState('');

  const handleAddSubject = () => {
    if (!newSubName.trim() || !newSubCode.trim() || !newSubSem.trim()) return;
    const newSub: Subject = {
      id: Math.random().toString(),
      name: newSubName,
      code: newSubCode,
      semester: newSubSem,
    };
    setSubjectsList([newSub, ...subjectsList]);
    setNewSubName(''); setNewSubCode(''); setNewSubSem('');
    setSubjectModalVisible(false);
    showToast('Subject added successfully!', 'success');
  };

  // --- Timetable Form State ---
  const [ttSem, setTtSem] = useState('');
  const [ttEntries, setTtEntries] = useState<PeriodEntry[]>([
    { id: Math.random().toString(), day: 'Monday', startTime: '', endTime: '', type: 'Subject' }
  ]);

  const addPeriodCard = () => {
    setTtEntries([
      ...ttEntries,
      { id: Math.random().toString(), day: 'Monday', startTime: '', endTime: '', type: 'Subject' }
    ]);
  };

  const removePeriodCard = (id: string) => {
    if (ttEntries.length === 1) return; // Keep at least one
    setTtEntries(ttEntries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof PeriodEntry, value: string) => {
    setTtEntries(ttEntries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleAddTimetable = () => {
    if (!ttSem.trim() || ttEntries.length === 0) {
      showToast('Please provide a Semester and at least one period.', 'error');
      return;
    }
    
    // Check if sem exists, update it, or add new
    const existingIndex = timetablesList.findIndex(t => t.semester === ttSem);
    if (existingIndex >= 0) {
      const updatedList = [...timetablesList];
      updatedList[existingIndex].entries = [...updatedList[existingIndex].entries, ...ttEntries];
      setTimetablesList(updatedList);
    } else {
      const newTT: Timetable = {
        id: Math.random().toString(),
        semester: ttSem,
        entries: ttEntries,
      };
      setTimetablesList([newTT, ...timetablesList]);
    }

    setTtSem('');
    setTtEntries([{ id: Math.random().toString(), day: 'Monday', startTime: '', endTime: '', type: 'Subject' }]);
    setTimetableModalVisible(false);
    showToast('Time Table saved successfully!', 'success');
  };

  // --- Renderers ---

  const renderSubjectItem = ({ item }: { item: Subject }) => (
    <View style={styles.cardContainer}>
      <View style={styles.cardInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSub}>Code: {item.code} • Sem: {item.semester}</Text>
        </View>
      </View>
    </View>
  );

  const renderTimetableItem = ({ item }: { item: Timetable }) => (
    <View style={styles.cardContainer}>
      <View style={styles.cardInfo}>
        <View style={[styles.avatar, { backgroundColor: COLORS.orangeLight }]}>
          <Text style={[styles.avatarText, { color: COLORS.orange }]}>S{item.semester}</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.cardTitle}>Semester {item.semester}</Text>
          <Text style={styles.cardSub}>{item.entries.length} Periods Scheduled</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.viewButton} 
        activeOpacity={0.7}
        onPress={() => {
          setSelectedTimetable(item);
          setViewTimetableModalVisible(true);
        }}
      >
        <ViewIcon width={20} height={20} color={COLORS.orange} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        <Text style={styles.headerTitle}>Curriculum</Text>
        {activeTab === 'Subjects' ? (
          <TouchableOpacity style={styles.addButton} onPress={() => setSubjectModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Add Subject</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={() => setTimetableModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Add Schedule</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Top Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'Subjects' && styles.tabBtnActive]}
          onPress={() => setActiveTab('Subjects')}
        >
          <Text style={[styles.tabText, activeTab === 'Subjects' && styles.tabTextActive]}>Subjects</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'TimeTable' && styles.tabBtnActive]}
          onPress={() => setActiveTab('TimeTable')}
        >
          <Text style={[styles.tabText, activeTab === 'TimeTable' && styles.tabTextActive]}>Time Table</Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic List */}
      <FlatList
        data={(activeTab === 'Subjects' ? subjectsList : timetablesList) as any[]}
        keyExtractor={item => item.id}
        renderItem={activeTab === 'Subjects' ? renderSubjectItem : renderTimetableItem as any}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No data found.</Text>
          </View>
        }
      />

      {/* ========================================================= */}
      {/* ADD SUBJECT MODAL */}
      {/* ========================================================= */}
      <Modal
        visible={subjectModalVisible}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
      >
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setSubjectModalVisible(false); }}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) + keyboardPadding }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Subject</Text>
                  <TouchableOpacity onPress={() => setSubjectModalVisible(false)}>
                    <Text style={styles.closeModalText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Subject Name</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. Data Structures" value={newSubName} onChangeText={setNewSubName} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Subject Code</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. CS301" value={newSubCode} onChangeText={setNewSubCode} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Semester Number</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. 3" keyboardType="numeric" value={newSubSem} onChangeText={setNewSubSem} />
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setSubjectModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, (!newSubName || !newSubCode || !newSubSem) && styles.saveBtnDisabled]} onPress={handleAddSubject}>
                    <Text style={styles.saveBtnText}>Save Subject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ========================================================= */}
      {/* ADD TIMETABLE MODAL (Dynamic Form) */}
      {/* ========================================================= */}
      <Modal
        visible={timetableModalVisible}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContentFullscreen, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 24) + keyboardPadding }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Time Table</Text>
              <TouchableOpacity onPress={() => setTimetableModalVisible(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              {/* Semester Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Target Semester Number</Text>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="e.g. 3" 
                  keyboardType="numeric" 
                  value={ttSem} 
                  onChangeText={setTtSem} 
                />
              </View>

              <View style={styles.divider} />
              
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>Periods</Text>
                <TouchableOpacity style={styles.addPeriodBtn} onPress={addPeriodCard}>
                  <Text style={styles.addPeriodBtnText}>+ Add Period</Text>
                </TouchableOpacity>
              </View>

              {/* Dynamic Entry Array */}
              {ttEntries.map((entry, index) => {
                const filteredSubjects = subjectsList.filter(s => s.semester === ttSem);
                
                return (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryTitle}>Period {index + 1}</Text>
                      {ttEntries.length > 1 && (
                        <TouchableOpacity onPress={() => removePeriodCard(entry.id)}>
                          <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Day Selection */}
                    <Text style={styles.subLabel}>Day</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                      {DAYS.map(day => (
                        <TouchableOpacity key={day} onPress={() => updateEntry(entry.id, 'day', day)}
                          style={[styles.chip, entry.day === day && styles.chipActive]}>
                          <Text style={[styles.chipText, entry.day === day && styles.chipTextActive]}>{day.slice(0, 3)}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Times */}
                    <View style={styles.rowInputs}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.subLabel}>Start Time</Text>
                        <TextInput style={styles.modalInputSm} placeholder="09:00 AM" value={entry.startTime} onChangeText={v => updateEntry(entry.id, 'startTime', v)} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.subLabel}>End Time</Text>
                        <TextInput style={styles.modalInputSm} placeholder="10:00 AM" value={entry.endTime} onChangeText={v => updateEntry(entry.id, 'endTime', v)} />
                      </View>
                    </View>

                    {/* Type Selection */}
                    <Text style={styles.subLabel}>Type</Text>
                    <View style={styles.typeContainer}>
                      {PERIOD_TYPES.map(type => (
                        <TouchableOpacity key={type} onPress={() => updateEntry(entry.id, 'type', type as any)}
                          style={[styles.chip, entry.type === type && styles.chipActive]}>
                          <Text style={[styles.chipText, entry.type === type && styles.chipTextActive]}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Conditional Subject & Staff Selection */}
                    {entry.type === 'Subject' && (
                      <>
                        <Text style={styles.subLabel}>Subject (Filtered by Sem {ttSem || '?'})</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                          {filteredSubjects.length === 0 ? (
                            <Text style={styles.noDataText}>No subjects added for Semester {ttSem || '?'} yet.</Text>
                          ) : (
                            filteredSubjects.map(sub => (
                              <TouchableOpacity key={sub.id} onPress={() => updateEntry(entry.id, 'subjectId', sub.id)}
                                style={[styles.chip, entry.subjectId === sub.id && styles.chipActive]}>
                                <Text style={[styles.chipText, entry.subjectId === sub.id && styles.chipTextActive]}>{sub.name}</Text>
                              </TouchableOpacity>
                            ))
                          )}
                        </ScrollView>

                        <Text style={styles.subLabel}>Staff</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                          {MOCK_STAFF.map(staff => (
                            <TouchableOpacity key={staff.id} onPress={() => updateEntry(entry.id, 'staffId', staff.id)}
                              style={[styles.chip, entry.staffId === staff.id && styles.chipActive]}>
                              <Text style={[styles.chipText, entry.staffId === staff.id && styles.chipTextActive]}>{staff.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </>
                    )}
                  </View>
                );
              })}

            </ScrollView>

            <View style={[styles.modalActions, { marginTop: 20 }]}>
              <TouchableOpacity style={styles.saveBtnFull} onPress={handleAddTimetable}>
                <Text style={styles.saveBtnText}>Save Time Table ({ttEntries.length} Periods)</Text>
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* VIEW TIMETABLE MODAL */}
      {/* ========================================================= */}
      <Modal
        visible={viewTimetableModalVisible}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFullscreen, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Semester {selectedTimetable?.semester} Schedule</Text>
              <TouchableOpacity onPress={() => setViewTimetableModalVisible(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedTimetable && DAYS.map(day => {
                const dayEntries = selectedTimetable.entries.filter(e => e.day === day);
                if (dayEntries.length === 0) return null;

                return (
                  <View key={day} style={styles.dayGroupContainer}>
                    <Text style={styles.dayGroupHeader}>{day}</Text>
                    {dayEntries.map(entry => {
                      const subject = subjectsList.find(s => s.id === entry.subjectId);
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
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, backgroundColor: COLORS.background },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  addButton: { backgroundColor: '#1B2A4A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.border, borderRadius: 12, marginHorizontal: 4 },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  cardContainer: { backgroundColor: COLORS.white, borderRadius: 20, padding: 18, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.purpleLight, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 20, fontWeight: '700', color: COLORS.purple },
  details: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  cardSub: { fontSize: 14, color: COLORS.textSecondary },
  viewButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { paddingTop: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '90%' },
  modalContentFullscreen: { backgroundColor: COLORS.white, flex: 1, paddingHorizontal: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  closeModalText: { fontSize: 20, fontWeight: '600', color: COLORS.textSecondary, padding: 4 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  modalInput: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: COLORS.textPrimary },
  modalInputSm: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: COLORS.inputBg, marginRight: 10, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  saveBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: COLORS.textPrimary, marginLeft: 10, alignItems: 'center' },
  saveBtnFull: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: COLORS.textPrimary, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#A0AABF', opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionHeader: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  addPeriodBtn: { backgroundColor: COLORS.purpleLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addPeriodBtnText: { color: COLORS.purple, fontWeight: '700', fontSize: 12 },
  entryCard: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16, marginBottom: 16 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  entryTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  removeText: { color: '#FF4757', fontWeight: '600', fontSize: 12 },
  subLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 4 },
  chipScroll: { marginBottom: 12 },
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white, fontWeight: '700' },
  noDataText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', paddingVertical: 8 },
  dayGroupContainer: { marginBottom: 24 },
  dayGroupHeader: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8 },
  viewEntryCard: { flexDirection: 'row', backgroundColor: COLORS.inputBg, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  viewTimeBox: { width: 90, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: COLORS.border, paddingRight: 10, marginRight: 10 },
  viewTimeText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  viewTimeDivider: { fontSize: 10, color: COLORS.textSecondary, marginVertical: 2 },
  viewDetailsBox: { flex: 1, justifyContent: 'center' },
  viewSubjectName: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  viewStaffName: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  viewBreakName: { fontSize: 15, fontWeight: '700', color: COLORS.orange, fontStyle: 'italic' },
});

export default TutorSubjectsScreen;
