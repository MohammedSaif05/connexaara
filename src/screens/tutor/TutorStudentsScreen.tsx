import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/ToastContext';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deactivateStudent,
  activateStudent,
  StudentListItem,
  StudentDetail,
  ApiError,
} from '../../services/api';
import { getAuthData } from '../../services/storage';
import SearchIcon from '../../assets/svg/search.svg';
import ViewIcon from '../../assets/svg/view.svg';
import NotFoundIcon from '../../assets/svg/not-found.svg';
import EditIcon from '../../assets/svg/edit.svg';
import Skeleton from '../../components/Skeleton';

const COLORS = {
  background: '#F0F2F8',
  white: '#FFFFFF',
  textPrimary: '#1A1F36',
  textSecondary: '#8A94A6',
  textTertiary: '#C4C9D4',
  primary: '#6C63FF',
  primaryLight: '#EEF0FF',
  border: '#E8EBF0',
  inputBg: '#F7F8FC',
  cardBg: '#FFFFFF',
  shadow: '#A0A3B1',
};

const AVATAR_PALETTE = [
  { bg: '#EEF0FF', text: '#6C63FF' },
  { bg: '#FFF0F6', text: '#F472B6' },
  { bg: '#ECFDF5', text: '#10B981' },
  { bg: '#FFF7ED', text: '#F97316' },
  { bg: '#EFF6FF', text: '#3B82F6' },
  { bg: '#FDF4FF', text: '#A855F7' },
];

const getAvatarColor = (name: string) =>
  AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];

const PAGE_LIMIT = 10;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ordinalSuffix = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const TutorStudentsScreen = () => {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [batchId, setBatchId] = useState<string | null>(null);
  const [studentList, setStudentList] = useState<StudentListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListLoading, setIsListLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'deactivated'>('active');

  // Detail modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Create modal
  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRegNo, setNewRegNo] = useState('');
  const [newDob, setNewDob] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit Detail
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRegNo, setEditRegNo] = useState('');
  const [editDob, setEditDob] = useState('');
  const [isSavingDetail, setIsSavingDetail] = useState(false);

  // Confirmation modal
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'activate' | 'deactivate'>('deactivate');
  const [isActivating, setIsActivating] = useState(false);

  const [keyboardPadding, setKeyboardPadding] = useState(0);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // ── Load batchId + keyboard tracking ────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'ios') return;
    const show = Keyboard.addListener('keyboardDidShow', e => setKeyboardPadding(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardPadding(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── Load batchId from storage ────────────────────────────────────────────────
  useEffect(() => {
    getAuthData().then(auth => {
      if (auth?.batchId) {
        setBatchId(auth.batchId);
      }
    });
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async (
    bid: string,
    page: number,
    search: string,
    tab: 'active' | 'deactivated',
    reset = false,
    silent = false,
  ) => {
    if (!silent) setIsListLoading(true);
    try {
      const res = await getStudents(bid, page, PAGE_LIMIT, search, tab === 'active');
      setStudentList(prev => reset ? res.data : [...prev, ...res.data]);
      setTotalCount(res.meta.total);
      setCurrentPage(page);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load students.', 'error');
    } finally {
      setIsListLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (batchId) fetchStudents(batchId, 1, '', activeTab, true);
  }, [batchId, activeTab]);

  const handleRefresh = () => {
    if (!batchId) return;
    setIsRefreshing(true);
    setSearchQuery('');
    searchInputRef.current?.blur();
    setStudentList([]);
    fetchStudents(batchId, 1, '', activeTab, true, false);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setIsTyping(!!text.trim());
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setIsTyping(false);
      if (batchId) fetchStudents(batchId, 1, text, activeTab, true);
    }, 500);
  };

  const handleLoadMore = () => {
    const hasMore = studentList.length < totalCount;
    if (!isListLoading && hasMore && batchId) {
      fetchStudents(batchId, currentPage + 1, searchQuery, activeTab, false);
    }
  };

  // ── View Student ─────────────────────────────────────────────────────────────
  const handleViewStudent = async (id: string) => {
    setDetailVisible(true);
    setIsDetailLoading(true);
    setSelectedStudent(null);
    setIsEditingDetail(false);
    try {
      const detail = await getStudentById(id);
      setSelectedStudent(detail);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load student details.', 'error');
      setDetailVisible(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // ── Edit Student ─────────────────────────────────────────────────────────────
  const openEditMode = () => {
    if (!selectedStudent) return;
    setEditName(selectedStudent.user.name);
    setEditEmail(selectedStudent.user.email);
    setEditRegNo(selectedStudent.registerNumber);
    setEditDob(''); 
    setIsEditingDetail(true);
  };

  const handleSaveDetail = async () => {
    if (!selectedStudent) return;
    if (!editName.trim() || !editEmail.trim() || !editRegNo.trim()) return;
    Keyboard.dismiss();
    setIsSavingDetail(true);
    try {
      const payload: any = {
        name: editName.trim(),
        email: editEmail.trim(),
        registerNumber: editRegNo.trim(),
      };
      if (editDob.trim()) payload.dob = editDob.trim();

      await updateStudent(selectedStudent.id, payload);
      setIsEditingDetail(false);
      setDetailVisible(false);
      showToast('Student updated successfully!', 'success');
      if (batchId) fetchStudents(batchId, 1, searchQuery, activeTab, true, true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update student.', 'error');
    } finally {
      setIsSavingDetail(false);
    }
  };

  // ── Activate / Deactivate ────────────────────────────────────────────────────
  const handleDeactivate = async () => {
    if (!selectedStudent) return;
    setIsActivating(true);
    try {
      await deactivateStudent(selectedStudent.id);
      showToast('Student deactivated successfully!', 'success');
      setConfirmVisible(false);
      setDetailVisible(false);
      if (batchId) fetchStudents(batchId, 1, searchQuery, activeTab, true, true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to deactivate student.', 'error');
      setIsActivating(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedStudent) return;
    setIsActivating(true);
    try {
      await activateStudent(selectedStudent.id);
      showToast('Student activated successfully!', 'success');
      setConfirmVisible(false);
      setDetailVisible(false);
      if (batchId) fetchStudents(batchId, 1, searchQuery, activeTab, true, true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to activate student.', 'error');
      setIsActivating(false);
    }
  };

  const openCreateModal = () => {
    setNewName(''); setNewEmail(''); setNewRegNo(''); setNewDob('');
    setCreateVisible(true);
  };

  // ── Create Student ───────────────────────────────────────────────────────────
  const handleCreateStudent = async () => {
    if (!newName.trim() || !newEmail.trim() || !newRegNo.trim() || !newDob.trim() || !batchId) return;
    Keyboard.dismiss();
    setIsCreating(true);
    try {
      await createStudent({
        name: newName.trim(),
        email: newEmail.trim(),
        registerNumber: newRegNo.trim(),
        dob: newDob.trim(),
        batchId: batchId,
      });
      setCreateVisible(false);
      showToast('Student added successfully!', 'success');
      fetchStudents(batchId, 1, searchQuery, activeTab, true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to add student.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const isCreateFormValid = !!newName.trim() && !!newEmail.trim() && !!newRegNo.trim() && !!newDob.trim() && !!batchId;

  // ── Card ─────────────────────────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: StudentListItem; index: number }) => {
    const color = getAvatarColor(item.name);
    const initials = item.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    return (
      <View style={[styles.card, index === 0 && { marginTop: 4 }]}>
        <View style={[styles.cardAvatar, { backgroundColor: color.bg }]}>
          <Text style={[styles.cardAvatarText, { color: color.text }]}>{initials}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSub}>{item.registerNumber}</Text>
        </View>
        <TouchableOpacity
          style={styles.viewBtn}
          activeOpacity={0.7}
          onPress={() => handleViewStudent(item.id)}
        >
          <ViewIcon width={18} height={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const hasMore = studentList.length < totalCount;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>Students</Text>
          <Text style={styles.headerSub}>{totalCount} total</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.85}
          onPress={openCreateModal}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
          <SearchIcon width={18} height={18} color={isSearchFocused ? COLORS.primary : COLORS.textSecondary} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search by name or register no..."
            placeholderTextColor={COLORS.textTertiary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
            blurOnSubmit
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => {
              setSearchQuery('');
              if (batchId) fetchStudents(batchId, 1, '', activeTab, true);
              searchInputRef.current?.blur();
            }}>
              <Text style={styles.clearText}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Tabs — same segmented control as Staff screen */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => { if (activeTab !== 'active') { setSearchQuery(''); setActiveTab('active'); } }}
          activeOpacity={0.8}
        >
          <View style={[styles.tabDot, { backgroundColor: activeTab === 'active' ? '#22C55E' : COLORS.textTertiary }]} />
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'deactivated' && styles.tabInactive]}
          onPress={() => { if (activeTab !== 'deactivated') { setSearchQuery(''); setActiveTab('deactivated'); } }}
          activeOpacity={0.8}
        >
          <View style={[styles.tabDot, { backgroundColor: activeTab === 'deactivated' ? '#EF4444' : COLORS.textTertiary }]} />
          <Text style={[styles.tabText, activeTab === 'deactivated' && styles.tabTextInactive]}>Deactivated</Text>
        </TouchableOpacity>
      </View>

      {isTyping && (
        <Text style={styles.searchingText}>Searching for "{searchQuery}"…</Text>
      )}

      {/* List */}
      {isListLoading && studentList.length === 0 ? (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {[1, 2, 3, 4, 5, 6].map((_, index) => (
            <View key={index} style={[styles.card, index === 0 && { marginTop: 4 }]}>
              <Skeleton width={44} height={44} borderRadius={22} style={{ marginRight: 12 }} />
              <View style={styles.cardBody}>
                <Skeleton width="60%" height={16} style={{ marginBottom: 6 }} />
                <Skeleton width="40%" height={14} />
              </View>
              <Skeleton width={32} height={32} borderRadius={16} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={studentList}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isListLoading && studentList.length > 0
              ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
              : hasMore ? null
              : studentList.length > 0
              ? <Text style={styles.endText}>All students loaded</Text>
              : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <NotFoundIcon width={90} height={90} />
              <Text style={styles.emptyTitle}>No Students Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No students matching "${searchQuery}"`
                  : activeTab === 'active'
                    ? 'Active students will appear here'
                    : 'Deactivated students will appear here'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Student Detail Modal ── */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => { setDetailVisible(false); setIsEditingDetail(false); }}
      >
        <TouchableWithoutFeedback onPress={() => { if (!isEditingDetail) { setDetailVisible(false); } else { Keyboard.dismiss(); } }}>
          <View style={styles.detailOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.detailSheet, { paddingBottom: Math.max(insets.bottom, 24) + (isEditingDetail ? keyboardPadding : 0) }]}>
                <View style={styles.modalHandle} />

            {isDetailLoading ? (
              <View style={styles.detailLoader}>
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text style={styles.loadingText}>Loading…</Text>
              </View>
            ) : selectedStudent ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
                {/* Header row */}
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>{isEditingDetail ? 'Edit Student' : 'Student Details'}</Text>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailVisible(false)}>
                    <Text style={styles.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>

                {isEditingDetail ? (
                  /* ── Edit Form ── */
                  <View style={styles.editForm}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Full Name</Text>
                      <TextInput style={styles.formInput} placeholder="e.g. Mohammed Saif" placeholderTextColor={COLORS.textTertiary} value={editName} onChangeText={setEditName} editable={!isSavingDetail} />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Email Address</Text>
                      <TextInput style={styles.formInput} placeholder="e.g. saif@student.edu" placeholderTextColor={COLORS.textTertiary} keyboardType="email-address" autoCapitalize="none" value={editEmail} onChangeText={setEditEmail} editable={!isSavingDetail} />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Register Number</Text>
                      <TextInput style={styles.formInput} placeholder="e.g. 2023CSE001" placeholderTextColor={COLORS.textTertiary} autoCapitalize="characters" value={editRegNo} onChangeText={setEditRegNo} editable={!isSavingDetail} />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Date of Birth <Text style={styles.inputHint}>(DDMMYYYY - Optional)</Text></Text>
                      <TextInput style={styles.formInput} placeholder="Leave blank to keep current" placeholderTextColor={COLORS.textTertiary} keyboardType="number-pad" maxLength={8} value={editDob} onChangeText={setEditDob} editable={!isSavingDetail} />
                    </View>
                    
                    <View style={styles.editActions}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditingDetail(false)} disabled={isSavingDetail}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveBtn, (!editName.trim() || !editEmail.trim() || !editRegNo.trim()) && styles.saveBtnDisabled]}
                        onPress={handleSaveDetail}
                        disabled={!editName.trim() || !editEmail.trim() || !editRegNo.trim() || isSavingDetail}
                        activeOpacity={0.85}
                      >
                        {isSavingDetail ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* ── View Detail ── */
                  <>
                    {/* Avatar */}
                    {(() => {
                      const c = getAvatarColor(selectedStudent.user.name);
                      const ini = selectedStudent.user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                      return (
                        <View style={styles.detailAvatarWrap}>
                          <View style={[styles.detailAvatar, { backgroundColor: c.bg }]}>
                            <Text style={[styles.detailAvatarText, { color: c.text }]}>{ini}</Text>
                          </View>
                        </View>
                      );
                    })()}

                    <Text style={styles.detailName}>{selectedStudent.user.name}</Text>
                    <Text style={styles.detailSub}>{selectedStudent.registerNumber}</Text>

                    {/* Info card */}
                    <View style={styles.infoCard}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{selectedStudent.user.email}</Text>
                      </View>
                      <View style={styles.infoRowDivider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Batch</Text>
                        <Text style={styles.infoValue}>{selectedStudent.batch.name}</Text>
                      </View>
                      <View style={styles.infoRowDivider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Semester</Text>
                        <Text style={styles.infoValue}>{ordinalSuffix(selectedStudent.batch.currentSemester)}</Text>
                      </View>
                      <View style={styles.infoRowDivider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>OD Requests</Text>
                        <Text style={styles.infoValue}>{selectedStudent._count.odRequests}</Text>
                      </View>
                      <View style={styles.infoRowDivider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Joined</Text>
                        <Text style={styles.infoValue}>{formatDate(selectedStudent.user.createdAt)}</Text>
                      </View>
                      <View style={styles.infoRowDivider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Status</Text>
                        <View style={[styles.badge, {
                          backgroundColor: selectedStudent.user.isActive ? '#ECFDF5' : '#FFF5F5',
                        }]}>
                          <Text style={[styles.badgeText, {
                            color: selectedStudent.user.isActive ? '#16A34A' : '#DC2626',
                          }]}>
                            {selectedStudent.user.isActive ? 'Active' : 'Deactivated'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={{ marginTop: 24, gap: 12 }}>
                      {selectedStudent.user.isActive ? (
                        <TouchableOpacity style={styles.editBtn} activeOpacity={0.8} onPress={openEditMode}>
                          <EditIcon width={20} height={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                          <Text style={styles.editBtnText}>Edit Student</Text>
                        </TouchableOpacity>
                      ) : null}

                      {selectedStudent.user.isActive ? (
                        <TouchableOpacity style={styles.deactivateBtn} activeOpacity={0.8} onPress={() => { setConfirmAction('deactivate'); setConfirmVisible(true); }}>
                          <Text style={styles.deactivateBtnText}>Deactivate Student</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity style={styles.activateBtn} activeOpacity={0.8} onPress={() => { setConfirmAction('activate'); setConfirmVisible(true); }}>
                          <Text style={styles.activateBtnText}>Activate Student</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </ScrollView>
            ) : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Create Student Modal ── */}
      <Modal visible={createVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setCreateVisible(false)}>
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setCreateVisible(false); }}>
          <KeyboardAvoidingView style={styles.createOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableWithoutFeedback>
              <View style={[styles.createSheet, { paddingBottom: Math.max(insets.bottom, 24) + keyboardPadding }]}>
                <View style={styles.modalHandle} />
                
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Add Student</Text>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCreateVisible(false)}>
                    <Text style={styles.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <TextInput style={styles.formInput} placeholder="e.g. Mohammed Saif" placeholderTextColor={COLORS.textTertiary} value={newName} onChangeText={setNewName} editable={!isCreating} />
                  </View>

                  {/* Email */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <TextInput style={styles.formInput} placeholder="e.g. saif@student.edu" placeholderTextColor={COLORS.textTertiary} keyboardType="email-address" autoCapitalize="none" value={newEmail} onChangeText={setNewEmail} editable={!isCreating} />
                  </View>

                  {/* Register Number */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Register Number</Text>
                    <TextInput style={styles.formInput} placeholder="e.g. 2023CSE001" placeholderTextColor={COLORS.textTertiary} autoCapitalize="characters" value={newRegNo} onChangeText={setNewRegNo} editable={!isCreating} />
                  </View>

                  {/* DOB */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Date of Birth <Text style={styles.inputHint}>(DDMMYYYY)</Text></Text>
                    <TextInput style={styles.formInput} placeholder="e.g. 15062005" placeholderTextColor={COLORS.textTertiary} keyboardType="number-pad" maxLength={8} value={newDob} onChangeText={setNewDob} editable={!isCreating} />
                  </View>
                </ScrollView>

                {/* Actions */}
                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateVisible(false)} disabled={isCreating}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, !isCreateFormValid && styles.saveBtnDisabled]}
                    onPress={handleCreateStudent}
                    disabled={!isCreateFormValid || isCreating}
                    activeOpacity={0.85}
                  >
                    {isCreating
                      ? <ActivityIndicator color={COLORS.white} size="small" />
                      : <Text style={styles.saveBtnText}>Add Student</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Confirmation Modal ── */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[styles.confirmIconWrap, { backgroundColor: confirmAction === 'activate' ? '#ECFDF5' : '#FEF2F2' }]}>
              <Text style={[styles.confirmIcon, { color: confirmAction === 'activate' ? '#16A34A' : '#DC2626' }]}>
                {confirmAction === 'activate' ? '✓' : '!'}
              </Text>
            </View>
            <Text style={styles.confirmTitle}>
              {confirmAction === 'activate' ? 'Activate Student' : 'Deactivate Student'}
            </Text>
            <Text style={styles.confirmDesc}>
              {confirmAction === 'activate' 
                ? 'Are you sure you want to activate this student? They will regain access to the platform.'
                : 'Are you sure you want to deactivate this student? They will lose access to the platform immediately.'}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmVisible(false)} disabled={isActivating}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmActionBtn, { backgroundColor: confirmAction === 'activate' ? COLORS.primary : '#DC2626' }]}
                onPress={confirmAction === 'activate' ? handleActivate : handleDeactivate}
                disabled={isActivating}
              >
                {isActivating ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.confirmActionText}>{confirmAction === 'activate' ? 'Activate' : 'Deactivate'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // Search
  searchWrap: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 10,
  },
  searchBarFocused: {
    borderColor: COLORS.primary,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    padding: 0,
  },
  clearText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '700',
    paddingHorizontal: 4,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#ECFDF5',
  },
  tabInactive: {
    backgroundColor: '#FEF2F2',
  },
  tabDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#16A34A',
    fontWeight: '700',
  },
  tabTextInactive: {
    color: '#DC2626',
    fontWeight: '700',
  },
  searchingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    paddingHorizontal: 24,
    marginBottom: 8,
    fontStyle: 'italic',
  },

  // Loader / List
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Card
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardAvatarText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cardBody: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  cardSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  viewBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endText: {
    textAlign: 'center',
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: '500',
    marginVertical: 16,
  },

  // Empty
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Detail modal
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,18,35,0.55)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  detailLoader: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  // Avatar in detail
  detailAvatarWrap: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  detailAvatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailAvatarText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -1,
  },
  detailName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  detailSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Info card
  infoCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  infoRowDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 18,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },

  // Badge
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Create modal
  createOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,18,35,0.55)',
    justifyContent: 'flex-end',
  },
  createSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    maxHeight: '92%',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputHint: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  formInput: {
    backgroundColor: COLORS.inputBg,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    fontWeight: '500',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1.6,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  // Edit Form
  editForm: {
    marginTop: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  deactivateBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: 14,
  },
  deactivateBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
  activateBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 14,
    borderRadius: 14,
  },
  activateBtnText: {
    color: '#16A34A',
    fontSize: 15,
    fontWeight: '700',
  },

  // Confirm Modal
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmBox: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmIcon: {
    fontSize: 32,
    fontWeight: '700',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmCancelText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  confirmActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmActionText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default TutorStudentsScreen;
