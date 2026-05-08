import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/ToastContext';
import {
  getOdRequests,
  createOdRequest,
  getStudents,
  OdRequest,
  StudentListItem,
  ApiError,
} from '../../services/api';
import { getAuthData } from '../../services/storage';
import NotFoundIcon from '../../assets/svg/not-found.svg';
import SearchIcon from '../../assets/svg/search.svg';

const COLORS = {
  background: '#F5F7FA',
  white: '#FFFFFF',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  textTertiary: '#C4C9D4',
  primary: '#6C63FF',
  primaryLight: '#EEF0FF',
  teal: '#2EC4B6',
  tealLight: '#E6FAF8',
  orange: '#FF9F43',
  orangeLight: '#FFF0E1',
  danger: '#FF4757',
  dangerLight: '#FFE5E7',
  border: '#E8EBF0',
  yellow: '#FBBF24',
  yellowLight: '#FEF3C7',
  green: '#10B981',
  greenLight: '#D1FAE5',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PENDING_TUTOR: { label: 'Pending Tutor', bg: COLORS.yellowLight, color: '#92400E' },
  PENDING_HOD: { label: 'Pending HOD', bg: COLORS.orangeLight, color: '#92400E' },
  APPROVED: { label: 'Approved', bg: COLORS.greenLight, color: '#065F46' },
  REJECTED_BY_TUTOR: { label: 'Rejected by Tutor', bg: COLORS.dangerLight, color: COLORS.danger },
  REJECTED_BY_HOD: { label: 'Rejected by HOD', bg: COLORS.dangerLight, color: COLORS.danger },
};

const StudentOdsScreen = () => {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [pendingOds, setPendingOds] = useState<OdRequest[]>([]);
  const [historyOds, setHistoryOds] = useState<OdRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Create Modal
  const [createVisible, setCreateVisible] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Group student picker
  const [batchStudents, setBatchStudents] = useState<StudentListItem[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);

  useEffect(() => {
    getAuthData().then(data => {
      if (data?.batchId) setBatchId(data.batchId);
    });
  }, []);

  const fetchOds = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await getOdRequests(1, 100);
      const all = res.data;
      const pending = all.filter(od => od.status === 'PENDING_TUTOR' || od.status === 'PENDING_HOD');
      const history = all.filter(od => od.status === 'APPROVED' || od.status === 'REJECTED_BY_TUTOR' || od.status === 'REJECTED_BY_HOD');
      setPendingOds(pending);
      setHistoryOds(history);
      setPendingTotal(pending.length);
      setHistoryTotal(history.length);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load OD requests', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => { fetchOds(); }, [fetchOds]);

  const handleRefresh = () => { setIsRefreshing(true); fetchOds(true); };

  const fetchBatchStudents = async () => {
    if (!batchId) return;
    setLoadingStudents(true);
    try {
      const res = await getStudents(batchId, 1, 200, '', true);
      setBatchStudents(res.data);
    } catch {
      showToast('Failed to load batch students', 'error');
    } finally {
      setLoadingStudents(false);
    }
  };

  const openCreateModal = () => {
    setNewSubject('');
    setNewDescription('');
    setIsGroup(false);
    setStartDate('');
    setEndDate('');
    setSelectedStudentIds(new Set());
    setStudentSearch('');
    setCreateVisible(true);
  };

  const toggleGroupMode = (val: boolean) => {
    setIsGroup(val);
    if (val && batchStudents.length === 0) {
      fetchBatchStudents();
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newSubject.trim()) { showToast('Please enter a subject/title', 'error'); return; }
    if (!newDescription.trim()) { showToast('Please enter a description', 'error'); return; }
    if (!startDate.trim()) { showToast('Please enter a start date', 'error'); return; }
    if (!endDate.trim()) { showToast('Please enter an end date', 'error'); return; }
    if (isGroup && selectedStudentIds.size === 0) { showToast('Select at least one participant', 'error'); return; }

    setIsCreating(true);
    try {
      await createOdRequest({
        subject: newSubject.trim(),
        description: newDescription.trim(),
        isGroup,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        participantIds: isGroup ? Array.from(selectedStudentIds) : undefined,
      });
      showToast('OD request submitted successfully!', 'success');
      setCreateVisible(false);
      fetchOds(true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to create OD request', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filteredStudents = batchStudents.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.registerNumber.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const renderOdCard = ({ item }: { item: OdRequest }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING_TUTOR;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            {item.isGroup && (
              <View style={[styles.statusBadge, { backgroundColor: COLORS.primaryLight }]}>
                <Text style={[styles.statusText, { color: COLORS.primary }]}>Group</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>{item.subject}</Text>
        <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>

        {/* Date Range */}
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>📅 {formatDate(item.startDate)} → {formatDate(item.endDate)}</Text>
        </View>

        {/* Participants */}
        {item.isGroup && item.participants?.length > 0 && (
          <View style={styles.participantsWrap}>
            <Text style={styles.participantsLabel}>
              👥 {item.participants.length} participant{item.participants.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Approval trail */}
        {item.approvals?.length > 0 && (
          <View style={styles.approvalTrail}>
            {item.approvals.map((a, idx) => (
              <View key={idx} style={styles.approvalItem}>
                <View style={[styles.approvalDot, { backgroundColor: a.status === 'APPROVED' ? COLORS.green : COLORS.danger }]} />
                <Text style={styles.approvalText}>
                  {a.approver.name} ({a.role}) — {a.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                </Text>
                {a.remark ? <Text style={styles.approvalRemark}>"{a.remark}"</Text> : null}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const currentData = activeTab === 'pending' ? pendingOds : historyOds;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>My ODs</Text>
          <Text style={styles.headerSubtitle}>Apply and track OD status</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} activeOpacity={0.8} onPress={openCreateModal}>
          <Text style={styles.createBtnTxt}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]} onPress={() => setActiveTab('pending')}>
          <Text style={[styles.tabTxt, activeTab === 'pending' && styles.tabTxtActive]}>Pending ({pendingTotal})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]} onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabTxt, activeTab === 'history' && styles.tabTxtActive]}>History ({historyTotal})</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading OD requests...</Text>
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={item => item.id}
          renderItem={renderOdCard}
          contentContainerStyle={[styles.list, currentData.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <NotFoundIcon width={100} height={100} />
              <Text style={styles.emptyTitle}>{activeTab === 'pending' ? 'No Pending Requests' : 'No History Yet'}</Text>
              <Text style={styles.emptyDesc}>{activeTab === 'pending' ? 'Tap "+ New" to create an OD request!' : 'Completed OD requests will appear here.'}</Text>
            </View>
          }
        />
      )}

      {/* Create OD Modal */}
      <Modal visible={createVisible} transparent animationType="slide" onRequestClose={() => setCreateVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>New OD Request</Text>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCreateVisible(false)}>
                    <Text style={styles.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.inputLabel}>Title / Event</Text>
                  <TextInput style={styles.formInput} placeholder="e.g. Smart India Hackathon 2026" placeholderTextColor={COLORS.textTertiary} value={newSubject} onChangeText={setNewSubject} />

                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput style={[styles.formInput, styles.textArea]} placeholder="Describe the event, venue, reason..." placeholderTextColor={COLORS.textTertiary} value={newDescription} onChangeText={setNewDescription} multiline numberOfLines={3} textAlignVertical="top" />

                  {/* Date Range */}
                  <View style={styles.dateInputRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Start Date</Text>
                      <TextInput style={styles.formInput} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textTertiary} value={startDate} onChangeText={setStartDate} />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>End Date</Text>
                      <TextInput style={styles.formInput} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textTertiary} value={endDate} onChangeText={setEndDate} />
                    </View>
                  </View>

                  {/* Individual / Group Toggle */}
                  <View style={styles.groupToggle}>
                    <View>
                      <Text style={styles.groupLabel}>Group OD</Text>
                      <Text style={styles.groupDesc}>Add batch mates to this OD</Text>
                    </View>
                    <Switch
                      value={isGroup}
                      onValueChange={toggleGroupMode}
                      trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                      thumbColor={isGroup ? COLORS.primary : COLORS.textTertiary}
                    />
                  </View>

                  {/* Student Picker */}
                  {isGroup && (
                    <View style={styles.studentPickerWrap}>
                      <View style={styles.studentSearchRow}>
                        <SearchIcon width={16} height={16} fill={COLORS.textTertiary} />
                        <TextInput
                          style={styles.studentSearchInput}
                          placeholder="Search students..."
                          placeholderTextColor={COLORS.textTertiary}
                          value={studentSearch}
                          onChangeText={setStudentSearch}
                        />
                      </View>

                      {selectedStudentIds.size > 0 && (
                        <Text style={styles.selectedCount}>
                          {selectedStudentIds.size} selected
                        </Text>
                      )}

                      {loadingStudents ? (
                        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 16 }} />
                      ) : (
                        <View style={styles.studentList}>
                          {filteredStudents.map(s => {
                            const isSelected = selectedStudentIds.has(s.id);
                            return (
                              <TouchableOpacity
                                key={s.id}
                                style={[styles.studentItem, isSelected && styles.studentItemSelected]}
                                activeOpacity={0.7}
                                onPress={() => toggleStudent(s.id)}
                              >
                                <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.studentItemName}>{s.name}</Text>
                                  <Text style={styles.studentItemReg}>{s.registerNumber}</Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}

                  <TouchableOpacity style={[styles.submitBtn, isCreating && { opacity: 0.7 }]} activeOpacity={0.85} onPress={handleCreate} disabled={isCreating}>
                    {isCreating ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.submitBtnTxt}>Submit Request</Text>}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  createBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  createBtnTxt: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: COLORS.white, gap: 10 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center' },
  tabBtnActive: { backgroundColor: COLORS.primaryLight },
  tabTxt: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTxtActive: { color: COLORS.primary, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: 16 },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.textPrimary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 12, color: COLORS.textSecondary },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 8 },
  dateRow: { marginTop: 4, marginBottom: 4 },
  dateLabel: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  participantsWrap: { marginTop: 6 },
  participantsLabel: { fontSize: 12, color: COLORS.teal, fontWeight: '600' },
  approvalTrail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  approvalItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' },
  approvalDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  approvalText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  approvalRemark: { fontSize: 12, color: COLORS.textTertiary, fontStyle: 'italic', marginLeft: 16, width: '100%', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '92%' },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  modalCloseTxt: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '700' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { height: 48, backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  textArea: { height: 100, paddingTop: 14 },
  dateInputRow: { flexDirection: 'row' },
  groupToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  groupLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  groupDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  studentPickerWrap: { backgroundColor: COLORS.background, borderRadius: 16, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  studentSearchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 10, paddingHorizontal: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  studentSearchInput: { flex: 1, height: 40, fontSize: 14, color: COLORS.textPrimary, marginLeft: 8 },
  selectedCount: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  studentList: { maxHeight: 200 },
  studentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, marginBottom: 4 },
  studentItemSelected: { backgroundColor: COLORS.primaryLight },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  studentItemName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  studentItemReg: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  submitBtn: { height: 52, backgroundColor: COLORS.primary, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  submitBtnTxt: { fontSize: 16, fontWeight: '700', color: COLORS.white },
});

export default StudentOdsScreen;
