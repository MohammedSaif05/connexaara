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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/ToastContext';
import {
  getOdRequests,
  approveOdRequest,
  rejectOdRequest,
  OdRequest,
  ApiError,
} from '../../services/api';
import NotFoundIcon from '../../assets/svg/not-found.svg';

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
  PENDING_HOD: { label: 'Pending Your Review', bg: COLORS.orangeLight, color: '#92400E' },
  APPROVED: { label: 'Approved', bg: COLORS.greenLight, color: '#065F46' },
  REJECTED_BY_TUTOR: { label: 'Rejected by Tutor', bg: COLORS.dangerLight, color: COLORS.danger },
  REJECTED_BY_HOD: { label: 'Rejected by You', bg: COLORS.dangerLight, color: COLORS.danger },
};

const HODOdsScreen = () => {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [pendingOds, setPendingOds] = useState<OdRequest[]>([]);
  const [approvedOds, setApprovedOds] = useState<OdRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [approvedTotal, setApprovedTotal] = useState(0);

  const [selectedOd, setSelectedOd] = useState<OdRequest | null>(null);
  const [actionVisible, setActionVisible] = useState(false);
  const [remark, setRemark] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchOds = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        getOdRequests(1, 100, 'PENDING_HOD'),
        getOdRequests(1, 100, 'APPROVED'),
      ]);
      setPendingOds(pendingRes.data);
      setPendingTotal(pendingRes.meta.total);
      setApprovedOds(approvedRes.data);
      setApprovedTotal(approvedRes.meta.total);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load OD requests', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => { fetchOds(); }, [fetchOds]);
  const handleRefresh = () => { setIsRefreshing(true); fetchOds(true); };

  const openActionModal = (od: OdRequest) => { setSelectedOd(od); setRemark(''); setActionVisible(true); };

  const handleApprove = async () => {
    if (!selectedOd) return;
    setIsProcessing(true);
    try {
      await approveOdRequest(selectedOd.id, remark);
      showToast('OD request approved!', 'success');
      setActionVisible(false);
      fetchOds(true);
    } catch (err) { showToast(err instanceof ApiError ? err.message : 'Failed to approve', 'error'); }
    finally { setIsProcessing(false); }
  };

  const handleReject = async () => {
    if (!selectedOd) return;
    if (!remark.trim()) { showToast('Please provide a reason for rejection', 'error'); return; }
    setIsProcessing(true);
    try {
      await rejectOdRequest(selectedOd.id, remark);
      showToast('OD request rejected', 'info');
      setActionVisible(false);
      fetchOds(true);
    } catch (err) { showToast(err instanceof ApiError ? err.message : 'Failed to reject', 'error'); }
    finally { setIsProcessing(false); }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const renderOdCard = ({ item }: { item: OdRequest }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING_HOD;
    const isPending = item.status === 'PENDING_HOD';
    return (
      <TouchableOpacity style={styles.card} activeOpacity={isPending ? 0.7 : 1} onPress={() => isPending && openActionModal(item)}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            {item.isGroup ? (
              <View style={[styles.statusBadge, { backgroundColor: COLORS.tealLight }]}>
                <Text style={[styles.statusText, { color: COLORS.teal }]}>Group</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.statusText, { color: COLORS.textSecondary }]}>Individual</Text>
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: COLORS.primaryLight }]}>
              <Text style={[styles.statusText, { color: COLORS.primary }]}>Sem {item.batch?.currentSemester}</Text>
            </View>
          </View>
        </View>

        {/* Student Info */}
        <View style={styles.studentRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{item.student?.user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>{item.student?.user?.name}</Text>
            <Text style={styles.studentReg}>{item.student?.registerNumber} • {item.batch?.name}</Text>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>{item.subject}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>📅 {formatDate(item.startDate)} → {formatDate(item.endDate)}</Text>
        </View>

        {item.isGroup && item.participants?.length > 0 && (
          <Text style={styles.participantCount}>👥 {item.participants.length} participants</Text>
        )}

        {/* Tutor approval info */}
        {item.approvals?.length > 0 && (
          <View style={styles.approvalTrail}>
            {item.approvals.map((a, idx) => (
              <View key={idx} style={styles.approvalItem}>
                <View style={[styles.approvalDot, { backgroundColor: a.status === 'APPROVED' ? COLORS.green : COLORS.danger }]} />
                <Text style={styles.approvalText}>{a.approver.name} ({a.role}) — {a.status === 'APPROVED' ? 'Approved' : 'Rejected'}</Text>
                {a.remark ? <Text style={styles.approvalRemark}>"{a.remark}"</Text> : null}
              </View>
            ))}
          </View>
        )}

        {isPending && (
          <View style={styles.cardActionRow}>
            <TouchableOpacity style={[styles.cardActionBtn, styles.cardRejectBtn]} activeOpacity={0.8} onPress={() => openActionModal(item)}>
              <Text style={styles.cardRejectTxt}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cardActionBtn, styles.cardApproveBtn]} activeOpacity={0.8} onPress={() => openActionModal(item)}>
              <Text style={styles.cardApproveTxt}>Review & Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const currentData = activeTab === 'pending' ? pendingOds : approvedOds;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <Text style={styles.headerTitle}>OD Requests</Text>
        <Text style={styles.headerSubtitle}>Department-level approval</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]} onPress={() => setActiveTab('pending')}>
          <Text style={[styles.tabTxt, activeTab === 'pending' && styles.tabTxtActive]}>Pending ({pendingTotal})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'approved' && styles.tabBtnActive]} onPress={() => setActiveTab('approved')}>
          <Text style={[styles.tabTxt, activeTab === 'approved' && styles.tabTxtActive]}>Approved ({approvedTotal})</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Loading requests...</Text></View>
      ) : (
        <FlatList data={currentData} keyExtractor={item => item.id} renderItem={renderOdCard}
          contentContainerStyle={[styles.list, currentData.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <NotFoundIcon width={100} height={100} />
              <Text style={styles.emptyTitle}>{activeTab === 'pending' ? 'No Pending Requests' : 'No Approved Requests'}</Text>
              <Text style={styles.emptyDesc}>{activeTab === 'pending' ? 'No OD requests waiting for your review.' : 'Approved OD requests will appear here.'}</Text>
            </View>
          }
        />
      )}

      {/* Review Modal */}
      <Modal visible={actionVisible} transparent animationType="slide" onRequestClose={() => setActionVisible(false)}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>
              <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Review Request</Text>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setActionVisible(false)}>
                    <Text style={styles.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {selectedOd && (
                    <>
                      <View style={styles.detailStudentRow}>
                        <View style={[styles.avatar, { width: 48, height: 48, borderRadius: 16 }]}>
                          <Text style={[styles.avatarTxt, { fontSize: 18 }]}>{selectedOd.student?.user?.name?.charAt(0)?.toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.detailName}>{selectedOd.student?.user?.name}</Text>
                          <Text style={styles.detailReg}>{selectedOd.student?.registerNumber} • {selectedOd.batch?.name}</Text>
                        </View>
                      </View>

                      {/* Context Badges */}
                      <View style={styles.badgesRow}>
                        <View style={[styles.statusBadge, { backgroundColor: selectedOd.isGroup ? COLORS.tealLight : COLORS.background }]}>
                          <Text style={[styles.statusText, { color: selectedOd.isGroup ? COLORS.teal : COLORS.textSecondary }]}>
                            {selectedOd.isGroup ? '👥 Group' : '👤 Individual'}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: COLORS.primaryLight }]}>
                          <Text style={[styles.statusText, { color: COLORS.primary }]}>🎓 Semester {selectedOd.batch?.currentSemester}</Text>
                        </View>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>TITLE / EVENT</Text>
                        <Text style={styles.detailValue}>{selectedOd.subject}</Text>
                      </View>
                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>DESCRIPTION</Text>
                        <Text style={styles.detailValue}>{selectedOd.description}</Text>
                      </View>
                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>DATE RANGE</Text>
                        <Text style={styles.detailValue}>📅 {formatDate(selectedOd.startDate)} → {formatDate(selectedOd.endDate)}</Text>
                      </View>
                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>SUBMITTED ON</Text>
                        <Text style={styles.detailValue}>{formatDate(selectedOd.createdAt)} at {formatTime(selectedOd.createdAt)}</Text>
                      </View>

                      {/* Participants */}
                      {selectedOd.isGroup && selectedOd.participants?.length > 0 && (
                        <View style={styles.detailSection}>
                          <Text style={styles.detailLabel}>PARTICIPANTS ({selectedOd.participants.length})</Text>
                          {selectedOd.participants.map((p, idx) => (
                            <View key={idx} style={styles.participantRow}>
                              <View style={styles.participantDot} />
                              <Text style={styles.participantName}>{p.student.user.name}</Text>
                              <Text style={styles.participantReg}>{p.student.registerNumber}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Tutor approval */}
                      {selectedOd.approvals?.length > 0 && (
                        <View style={styles.detailSection}>
                          <Text style={styles.detailLabel}>TUTOR APPROVAL</Text>
                          {selectedOd.approvals.map((a, idx) => (
                            <View key={idx} style={{ marginTop: 4 }}>
                              <Text style={styles.detailValue}>✅ {a.approver.name} — {a.status === 'APPROVED' ? 'Approved' : 'Rejected'}</Text>
                              {a.remark ? <Text style={[styles.detailValue, { color: COLORS.textSecondary, fontStyle: 'italic' }]}>"{a.remark}"</Text> : null}
                            </View>
                          ))}
                        </View>
                      )}

                      <Text style={styles.inputLabel}>Your Remark</Text>
                      <TextInput style={[styles.formInput, styles.textArea]} placeholder="Add a remark (required for rejection)" placeholderTextColor={COLORS.textTertiary} value={remark} onChangeText={setRemark} multiline numberOfLines={3} textAlignVertical="top" />

                      <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} activeOpacity={0.85} onPress={handleReject} disabled={isProcessing}>
                          {isProcessing ? <ActivityIndicator size="small" color={COLORS.danger} /> : <Text style={styles.rejectBtnTxt}>Reject</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} activeOpacity={0.85} onPress={handleApprove} disabled={isProcessing}>
                          {isProcessing ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.approveBtnTxt}>Approve</Text>}
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </ScrollView>
              </View>
          </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  studentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarTxt: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  studentName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  studentReg: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  dateRow: { marginTop: 8 },
  dateLabel: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  participantCount: { fontSize: 12, color: COLORS.teal, fontWeight: '600', marginTop: 6 },
  approvalTrail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  approvalItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' },
  approvalDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  approvalText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  approvalRemark: { fontSize: 12, color: COLORS.textTertiary, fontStyle: 'italic', marginLeft: 16, width: '100%', marginTop: 2 },
  cardActionRow: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  cardActionBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardRejectBtn: { backgroundColor: COLORS.dangerLight, borderWidth: 1, borderColor: COLORS.danger },
  cardRejectTxt: { fontSize: 14, fontWeight: '700', color: COLORS.danger },
  cardApproveBtn: { backgroundColor: COLORS.primary },
  cardApproveTxt: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  tapHint: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  tapHintTxt: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '92%' },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  modalCloseTxt: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '700' },
  detailStudentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  detailName: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  detailReg: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  detailSection: { marginBottom: 16 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary, letterSpacing: 0.5, marginBottom: 6 },
  detailValue: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22 },
  participantRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, backgroundColor: COLORS.background, borderRadius: 10, marginBottom: 4 },
  participantDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.teal, marginRight: 10 },
  participantName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  participantReg: { fontSize: 12, color: COLORS.textSecondary },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { height: 48, backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  textArea: { height: 90, paddingTop: 14 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 16 },
  actionBtn: { flex: 1, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  rejectBtn: { backgroundColor: COLORS.dangerLight, borderWidth: 1, borderColor: COLORS.danger },
  rejectBtnTxt: { fontSize: 16, fontWeight: '700', color: COLORS.danger },
  approveBtn: { backgroundColor: COLORS.green },
  approveBtnTxt: { fontSize: 16, fontWeight: '700', color: COLORS.white },
});

export default HODOdsScreen;
