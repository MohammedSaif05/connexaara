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
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/ToastContext';
import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  assignSubject,
  getStaff,
  SubjectListItem,
  SubjectDetail,
  StaffMember,
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

const ordinalSuffix = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const TutorSubjectsScreen = () => {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [currentSemester, setCurrentSemester] = useState<number | null>(null);
  const [subjectList, setSubjectList] = useState<SubjectListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListLoading, setIsListLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'previous'>('current');

  // Detail modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Create modal
  const [createVisible, setCreateVisible] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubSemester, setNewSubSemester] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchName, setBatchName] = useState<string | null>(null);

  // Edit modal
  const [editVisible, setEditVisible] = useState(false);
  const [editSubName, setEditSubName] = useState('');
  const [editSubCode, setEditSubCode] = useState('');
  const [editSubSemester, setEditSubSemester] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Assign teacher
  const [assignVisible, setAssignVisible] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const [keyboardPadding, setKeyboardPadding] = useState(0);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // ── Keyboard tracking ──────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'ios') return;
    const show = Keyboard.addListener('keyboardDidShow', e => setKeyboardPadding(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardPadding(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── Load currentSemester from storage ──────────────────────────────────────
  useEffect(() => {
    getAuthData().then(auth => {
      if (auth?.currentSemester) {
        setCurrentSemester(auth.currentSemester);
      }
      if (auth?.departmentId) {
        setDepartmentId(auth.departmentId);
      }
      if (auth?.batchId) {
        setBatchId(auth.batchId);
      }
      if (auth?.batchName) {
        setBatchName(auth.batchName);
      }
    });
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchSubjects = useCallback(async (
    semester: number | undefined,
    page: number,
    search: string,
    reset = false,
    silent = false,
  ) => {
    if (!silent) setIsListLoading(true);
    try {
      const res = await getSubjects(page, PAGE_LIMIT, search, semester);
      setSubjectList(prev => reset ? res.data : [...prev, ...res.data]);
      setTotalCount(res.meta.total);
      setCurrentPage(page);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load subjects.', 'error');
    } finally {
      setIsListLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Compute semester filter for current tab
  const getSemesterFilter = useCallback((tab: 'current' | 'previous') => {
    if (!currentSemester) return undefined;
    return tab === 'current' ? currentSemester : undefined;
  }, [currentSemester]);

  useEffect(() => {
    if (currentSemester === null) return;
    const sem = getSemesterFilter(activeTab);
    fetchSubjects(sem, 1, '', true);
  }, [currentSemester, activeTab]);

  const handleRefresh = () => {
    if (currentSemester === null) return;
    setIsRefreshing(true);
    setSearchQuery('');
    searchInputRef.current?.blur();
    const sem = getSemesterFilter(activeTab);
    fetchSubjects(sem, 1, '', true, true);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setIsTyping(!!text.trim());
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setIsTyping(false);
      if (currentSemester === null) return;
      const sem = getSemesterFilter(activeTab);
      fetchSubjects(sem, 1, text, true);
    }, 500);
  };

  const handleLoadMore = () => {
    const hasMore = subjectList.length < totalCount;
    if (!isListLoading && hasMore) {
      const sem = getSemesterFilter(activeTab);
      fetchSubjects(sem, currentPage + 1, searchQuery, false);
    }
  };

  // ── View Subject ─────────────────────────────────────────────────────────────
  const handleViewSubject = async (id: string) => {
    setDetailVisible(true);
    setIsDetailLoading(true);
    setSelectedSubject(null);
    try {
      const detail = await getSubjectById(id);
      setSelectedSubject(detail);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load subject details.', 'error');
      setDetailVisible(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // ── Create Subject ──────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setNewSubName(''); setNewSubCode(''); setNewSubSemester('');
    setCreateVisible(true);
  };

  const isCreateFormValid = !!newSubName.trim() && !!newSubCode.trim() && !!newSubSemester.trim() && !!departmentId;

  const handleCreateSubject = async () => {
    if (!isCreateFormValid) return;
    Keyboard.dismiss();
    setIsCreating(true);
    try {
      await createSubject({
        name: newSubName.trim(),
        subjectCode: newSubCode.trim(),
        departmentId: departmentId!,
        semester: parseInt(newSubSemester.trim(), 10),
      });
      setCreateVisible(false);
      showToast('Subject added successfully!', 'success');
      const sem = getSemesterFilter(activeTab);
      fetchSubjects(sem, 1, searchQuery, true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to add subject.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Edit Subject ────────────────────────────────────────────────────────────
  const openEditModal = () => {
    if (!selectedSubject) return;
    setEditSubName(selectedSubject.name);
    setEditSubCode(selectedSubject.subjectCode);
    setEditSubSemester(String(selectedSubject.semester));
    setEditVisible(true);
  };

  const isEditFormValid = !!editSubName.trim() && !!editSubCode.trim() && !!editSubSemester.trim();

  const handleEditSubject = async () => {
    if (!isEditFormValid || !selectedSubject) return;
    Keyboard.dismiss();
    setIsEditing(true);
    try {
      const payload: any = {};
      if (editSubName.trim() !== selectedSubject.name) payload.name = editSubName.trim();
      if (editSubCode.trim() !== selectedSubject.subjectCode) payload.subjectCode = editSubCode.trim();
      if (parseInt(editSubSemester.trim(), 10) !== selectedSubject.semester) payload.semester = parseInt(editSubSemester.trim(), 10);

      if (Object.keys(payload).length > 0) {
        await updateSubject(selectedSubject.id, payload);
        showToast('Subject updated successfully!', 'success');
        
        // Refresh the detail modal
        const detail = await getSubjectById(selectedSubject.id);
        setSelectedSubject(detail);
        
        // Refresh the list
        const sem = getSemesterFilter(activeTab);
        fetchSubjects(sem, 1, searchQuery, true);
      }
      setEditVisible(false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update subject.', 'error');
    } finally {
      setIsEditing(false);
    }
  };

  // ── Assign Teacher ─────────────────────────────────────────────────────────
  const openAssignModal = async () => {
    setAssignVisible(true);
    setIsLoadingStaff(true);
    try {
      const res = await getStaff(1, 100, '', true);
      setStaffList(res.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load staff.', 'error');
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleAssignTeacher = async (staffId: string) => {
    if (!selectedSubject || !batchId) return;
    setIsAssigning(true);
    try {
      await assignSubject({
        subjectId: selectedSubject.id,
        batchId,
        staffId,
      });
      showToast('Teacher assigned successfully!', 'success');
      setAssignVisible(false);
      // Refresh the detail
      const detail = await getSubjectById(selectedSubject.id);
      setSelectedSubject(detail);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to assign teacher.', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  // ── Filter list safely based on tab ─────────────────────────────────────────
  const filteredList = subjectList.filter(s => {
    if (!currentSemester) return false;
    if (activeTab === 'current') return s.semester === currentSemester;
    return s.semester < currentSemester;
  });

  // ── Card ─────────────────────────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: SubjectListItem; index: number }) => {
    const color = getAvatarColor(item.name);
    const initials = item.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    return (
      <View style={[styles.card, index === 0 && { marginTop: 4 }]}>
        <View style={[styles.cardAvatar, { backgroundColor: color.bg }]}>
          <Text style={[styles.cardAvatarText, { color: color.text }]}>{initials}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSub}>{item.subjectCode} • {ordinalSuffix(item.semester)} Sem</Text>
        </View>
        <TouchableOpacity
          style={styles.viewBtn}
          activeOpacity={0.7}
          onPress={() => handleViewSubject(item.id)}
        >
          <ViewIcon width={18} height={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const hasMore = filteredList.length < totalCount;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>Subjects</Text>
          <Text style={styles.headerSub}>{totalCount} total</Text>
        </View>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.85} onPress={openCreateModal}>
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
            placeholder="Search by name or code..."
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
              const sem = getSemesterFilter(activeTab);
              fetchSubjects(sem, 1, '', true);
              searchInputRef.current?.blur();
            }}>
              <Text style={styles.clearText}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'current' && styles.tabActive]}
          onPress={() => { if (activeTab !== 'current') { setSearchQuery(''); setActiveTab('current'); } }}
          activeOpacity={0.8}
        >
          <View style={[styles.tabDot, { backgroundColor: activeTab === 'current' ? '#6C63FF' : COLORS.textTertiary }]} />
          <Text style={[styles.tabText, activeTab === 'current' && styles.tabTextActive]}>
            {currentSemester ? `${ordinalSuffix(currentSemester)} Sem` : 'Current'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'previous' && styles.tabPrevious]}
          onPress={() => { if (activeTab !== 'previous') { setSearchQuery(''); setActiveTab('previous'); } }}
          activeOpacity={0.8}
        >
          <View style={[styles.tabDot, { backgroundColor: activeTab === 'previous' ? '#F97316' : COLORS.textTertiary }]} />
          <Text style={[styles.tabText, activeTab === 'previous' && styles.tabTextPrevious]}>Previous</Text>
        </TouchableOpacity>
      </View>

      {isTyping && (
        <Text style={styles.searchingText}>Searching for "{searchQuery}"…</Text>
      )}

      {/* List */}
      {isListLoading && subjectList.length === 0 ? (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {[1, 2, 3, 4, 5].map((_, index) => (
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
          data={filteredList}
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
            isListLoading && subjectList.length > 0
              ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
              : hasMore ? null
              : filteredList.length > 0
              ? <Text style={styles.endText}>All subjects loaded</Text>
              : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <NotFoundIcon width={90} height={90} />
              <Text style={styles.emptyTitle}>No Subjects Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No subjects matching "${searchQuery}"`
                  : activeTab === 'current'
                    ? 'Current semester subjects will appear here'
                    : 'Previous semester subjects will appear here'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Subject Detail Modal ── */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setDetailVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDetailVisible(false)}>
          <View style={styles.detailOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.detailSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <View style={styles.modalHandle} />

                {isDetailLoading ? (
                  <View style={styles.detailLoader}>
                    <ActivityIndicator color={COLORS.primary} size="large" />
                    <Text style={styles.loadingText}>Loading…</Text>
                  </View>
                ) : selectedSubject ? (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                    {/* Header row */}
                    <View style={styles.modalHeaderRow}>
                      <Text style={styles.modalTitle}>Subject Details</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={openEditModal}>
                          <EditIcon width={16} height={16} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailVisible(false)}>
                          <Text style={styles.modalCloseTxt}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Avatar */}
                    {(() => {
                      const c = getAvatarColor(selectedSubject.name);
                      const ini = selectedSubject.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                      return (
                        <View style={styles.detailAvatarWrap}>
                          <View style={[styles.detailAvatar, { backgroundColor: c.bg }]}>
                            <Text style={[styles.detailAvatarText, { color: c.text }]}>{ini}</Text>
                          </View>
                        </View>
                      );
                    })()}

                    <Text style={styles.detailName}>{selectedSubject.name}</Text>
                    <Text style={styles.detailSub}>{selectedSubject.subjectCode}</Text>

                    {/* Info card */}
                    <View style={styles.infoCard}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Semester</Text>
                        <Text style={styles.infoValue}>{ordinalSuffix(selectedSubject.semester)}</Text>
                      </View>
                      <View style={styles.infoRowDivider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Batch</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{batchName ?? '—'}</Text>
                      </View>
                      <View style={styles.infoRowDivider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Department</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{selectedSubject.department.name}</Text>
                      </View>
                      <View style={styles.infoRowDivider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Timetable Slots</Text>
                        <Text style={styles.infoValue}>{selectedSubject._count.timetableSlots}</Text>
                      </View>
                    </View>

                    {/* Assignments */}
                    {selectedSubject.assignments.length > 0 && (
                      <View style={{ marginTop: 4 }}>
                        <Text style={styles.sectionTitle}>Batch Assignments</Text>
                        {selectedSubject.assignments.map((a) => (
                          <View key={a.id} style={styles.assignmentCard}>
                            <View style={styles.assignmentRow}>
                              <Text style={styles.assignmentLabel}>Staff</Text>
                              <Text style={styles.assignmentValue}>
                                {a.staff ? a.staff.name : 'Not Assigned'}
                              </Text>
                            </View>
                            {a.staff?.email && (
                              <>
                                <View style={styles.assignmentDivider} />
                                <View style={styles.assignmentRow}>
                                  <Text style={styles.assignmentLabel}>Email</Text>
                                  <Text style={styles.assignmentValue} numberOfLines={1}>{a.staff.email}</Text>
                                </View>
                              </>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Assign Teacher button */}
                    <TouchableOpacity
                      style={styles.assignBtn}
                      activeOpacity={0.85}
                      onPress={openAssignModal}
                    >
                      <Text style={styles.assignBtnText}>Assign Teacher</Text>
                    </TouchableOpacity>
                  </ScrollView>
                ) : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Create Subject Modal ── */}
      <Modal visible={createVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setCreateVisible(false)}>
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setCreateVisible(false); }}>
          <KeyboardAvoidingView style={styles.createOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableWithoutFeedback>
              <View style={[styles.createSheet, { paddingBottom: Math.max(insets.bottom, 24) + keyboardPadding }]}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Add Subject</Text>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCreateVisible(false)}>
                    <Text style={styles.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Subject Name</Text>
                    <TextInput style={styles.formInput} placeholder="e.g. Data Structures" placeholderTextColor={COLORS.textTertiary} value={newSubName} onChangeText={setNewSubName} editable={!isCreating} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Subject Code</Text>
                    <TextInput style={styles.formInput} placeholder="e.g. CS201" placeholderTextColor={COLORS.textTertiary} autoCapitalize="characters" value={newSubCode} onChangeText={setNewSubCode} editable={!isCreating} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Semester</Text>
                    <TextInput style={styles.formInput} placeholder="e.g. 3" placeholderTextColor={COLORS.textTertiary} keyboardType="number-pad" maxLength={2} value={newSubSemester} onChangeText={setNewSubSemester} editable={!isCreating} />
                  </View>
                </ScrollView>

                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateVisible(false)} disabled={isCreating}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, !isCreateFormValid && styles.saveBtnDisabled]}
                    onPress={handleCreateSubject}
                    disabled={!isCreateFormValid || isCreating}
                    activeOpacity={0.85}
                  >
                    {isCreating
                      ? <ActivityIndicator color={COLORS.white} size="small" />
                      : <Text style={styles.saveBtnText}>Add Subject</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Edit Subject Modal ── */}
      <Modal visible={editVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setEditVisible(false)}>
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setEditVisible(false); }}>
          <KeyboardAvoidingView style={styles.createOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableWithoutFeedback>
              <View style={[styles.createSheet, { paddingBottom: Math.max(insets.bottom, 24) + keyboardPadding }]}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Edit Subject</Text>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setEditVisible(false)}>
                    <Text style={styles.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Subject Name</Text>
                    <TextInput style={styles.formInput} placeholder="e.g. Data Structures" placeholderTextColor={COLORS.textTertiary} value={editSubName} onChangeText={setEditSubName} editable={!isEditing} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Subject Code</Text>
                    <TextInput style={styles.formInput} placeholder="e.g. CS201" placeholderTextColor={COLORS.textTertiary} autoCapitalize="characters" value={editSubCode} onChangeText={setEditSubCode} editable={!isEditing} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Semester</Text>
                    <TextInput style={styles.formInput} placeholder="e.g. 3" placeholderTextColor={COLORS.textTertiary} keyboardType="number-pad" maxLength={2} value={editSubSemester} onChangeText={setEditSubSemester} editable={!isEditing} />
                  </View>
                </ScrollView>

                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditVisible(false)} disabled={isEditing}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, !isEditFormValid && styles.saveBtnDisabled]}
                    onPress={handleEditSubject}
                    disabled={!isEditFormValid || isEditing}
                    activeOpacity={0.85}
                  >
                    {isEditing
                      ? <ActivityIndicator color={COLORS.white} size="small" />
                      : <Text style={styles.saveBtnText}>Save Changes</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Assign Teacher Modal ── */}
      <Modal visible={assignVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setAssignVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setAssignVisible(false)}>
          <View style={styles.detailOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.assignSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Select Teacher</Text>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setAssignVisible(false)}>
                    <Text style={styles.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>

                {isLoadingStaff ? (
                  <View style={styles.detailLoader}>
                    <ActivityIndicator color={COLORS.primary} size="large" />
                    <Text style={styles.loadingText}>Loading staff…</Text>
                  </View>
                ) : staffList.length === 0 ? (
                  <View style={styles.detailLoader}>
                    <Text style={styles.loadingText}>No active staff found</Text>
                  </View>
                ) : (
                  <FlatList
                    data={staffList}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                      const c = getAvatarColor(item.name);
                      const ini = item.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                      return (
                        <TouchableOpacity
                          style={styles.staffCard}
                          activeOpacity={0.7}
                          onPress={() => handleAssignTeacher(item.id)}
                          disabled={isAssigning}
                        >
                          <View style={[styles.cardAvatar, { backgroundColor: c.bg }]}>
                            <Text style={[styles.cardAvatarText, { color: c.text }]}>{ini}</Text>
                          </View>
                          <View style={styles.cardBody}>
                            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.cardSub}>{item.email}</Text>
                          </View>
                          {isAssigning && (
                            <ActivityIndicator color={COLORS.primary} size="small" />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },

  // Search
  searchWrap: { paddingHorizontal: 24, marginBottom: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: COLORS.border, gap: 10,
  },
  searchBarFocused: { borderColor: COLORS.primary },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '500', padding: 0 },
  clearText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700', paddingHorizontal: 4 },

  // Tabs
  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 12,
    backgroundColor: COLORS.white, borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 11, gap: 6,
  },
  tabActive: { backgroundColor: COLORS.primaryLight },
  tabPrevious: { backgroundColor: '#FFF7ED' },
  tabDot: { width: 7, height: 7, borderRadius: 4 },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  tabTextPrevious: { color: '#F97316', fontWeight: '700' },
  searchingText: {
    fontSize: 13, color: COLORS.textSecondary, fontWeight: '500',
    paddingHorizontal: 24, marginBottom: 8, fontStyle: 'italic',
  },

  // Loader / List
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  cardAvatar: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardAvatarText: { fontSize: 17, fontWeight: '800', letterSpacing: -0.5 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.2, marginBottom: 3 },
  cardSub: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  viewBtn: {
    width: 36, height: 36, borderRadius: 11, backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },

  endText: { textAlign: 'center', color: COLORS.textTertiary, fontSize: 13, fontWeight: '500', marginVertical: 16 },

  // Empty
  emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', textAlign: 'center', paddingHorizontal: 32 },

  // Detail modal
  detailOverlay: { flex: 1, backgroundColor: 'rgba(15,18,35,0.55)', justifyContent: 'flex-end' },
  detailSheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 16, maxHeight: '90%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20 },
  detailLoader: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  modalTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.inputBg, justifyContent: 'center', alignItems: 'center' },
  modalCloseTxt: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },

  // Avatar in detail
  detailAvatarWrap: { alignSelf: 'center', marginBottom: 12 },
  detailAvatar: { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  detailAvatarText: { fontSize: 26, fontWeight: '800', letterSpacing: -1 },
  detailName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', letterSpacing: -0.4, marginBottom: 4 },
  detailSub: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', textAlign: 'center', marginBottom: 20 },

  // Info card
  infoCard: {
    backgroundColor: COLORS.inputBg, borderRadius: 18, borderWidth: 1,
    borderColor: COLORS.border, overflow: 'hidden', marginBottom: 20,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  infoRowDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 18 },
  infoLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  infoValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },

  // Assignments section
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, letterSpacing: -0.3 },
  assignmentCard: {
    backgroundColor: COLORS.inputBg, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, overflow: 'hidden', marginBottom: 10,
  },
  assignmentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  assignmentDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  assignmentLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  assignmentValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '700', maxWidth: '55%', textAlign: 'right' },

  // Add button
  addButton: {
    backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  addButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },

  // Create modal
  createOverlay: { flex: 1, backgroundColor: 'rgba(15,18,35,0.55)', justifyContent: 'flex-end' },
  createSheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 16, maxHeight: '85%',
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, letterSpacing: 0.2 },
  formInput: {
    backgroundColor: COLORS.inputBg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: COLORS.textPrimary, fontWeight: '600', borderWidth: 1, borderColor: COLORS.border,
  },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  saveBtn: {
    flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  // Assign teacher
  assignBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  assignBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  assignSheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 16, maxHeight: '75%',
  },
  staffCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg,
    borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
});

export default TutorSubjectsScreen;
