import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/ToastContext';
import { getBatches, createBatch, getBatchById, getAvailableTutors, assignTutor, promoteBatch, passoutBatch, Batch, BatchDetail, AvailableTutor, ApiError } from '../../services/api';
import { Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import SearchIcon from '../../assets/svg/search.svg';
import ViewIcon from '../../assets/svg/view.svg';
import NotFoundIcon from '../../assets/svg/not-found.svg';
import Skeleton from '../../components/Skeleton';

const COLORS = {
  background: '#F0F2F8',
  white: '#FFFFFF',
  textPrimary: '#1A1F36',
  textSecondary: '#8A94A6',
  textTertiary: '#C4C9D4',
  primary: '#6C63FF',
  primaryLight: '#EEF0FF',
  teal: '#2EC4B6',
  tealLight: '#E6FAF8',
  border: '#E8EBF0',
  inputBg: '#F7F8FC',
  cardBg: '#FFFFFF',
  shadow: '#A0A3B1',
};

const PAGE_LIMIT = 10;

// Palette cycles for batch year avatars
const BATCH_PALETTE = [
  { bg: '#EEF0FF', text: '#6C63FF' },
  { bg: '#E6FAF8', text: '#2EC4B6' },
  { bg: '#FFF7ED', text: '#F97316' },
  { bg: '#F0FDF4', text: '#22C55E' },
  { bg: '#FDF2F8', text: '#EC4899' },
  { bg: '#EFF6FF', text: '#3B82F6' },
];

const getBatchColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BATCH_PALETTE[Math.abs(hash) % BATCH_PALETTE.length];
};

const ordinalSuffix = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// ─────────────────────────────────────────────────────────────────────────────

const HODBatchesScreen = () => {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  // --- Tab ---
  const [activeTab, setActiveTab] = useState<'active' | 'passedout'>('active');

  // --- List State ---
  const [batchList, setBatchList] = useState<Batch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListLoading, setIsListLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Refs
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // --- Create Batch Modal ---
  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStartYear, setNewStartYear] = useState('');
  const [newEndYear, setNewEndYear] = useState('');
  const [newSemester, setNewSemester] = useState('1');
  const [isCreating, setIsCreating] = useState(false);

  // --- Detail Modal ---
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // --- Assign Tutor Modal ---
  const [tutorPickerVisible, setTutorPickerVisible] = useState(false);
  const [availableTutors, setAvailableTutors] = useState<AvailableTutor[]>([]);
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  // --- Promote / Passout ---
  const [isPromoting, setIsPromoting] = useState(false);
  const [isPassingOut, setIsPassingOut] = useState(false);
  const [promoteConfirmVisible, setPromoteConfirmVisible] = useState(false);
  const [passoutConfirmVisible, setPassoutConfirmVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') return;
    const s = Keyboard.addListener('keyboardDidShow', e => setKeyboardPadding(e.endCoordinates.height));
    const h = Keyboard.addListener('keyboardDidHide', () => setKeyboardPadding(0));
    return () => { s.remove(); h.remove(); };
  }, []);

  // --- Data Fetching ---
  const fetchBatches = useCallback(async (
    page: number,
    search: string,
    tab: 'active' | 'passedout',
    reset = false,
    silent = false,
  ) => {
    if (!silent) setIsListLoading(true);
    try {
      const res = await getBatches(page, PAGE_LIMIT, search, tab === 'passedout');
      setBatchList(prev => reset ? res.data : [...prev, ...res.data]);
      setTotalCount(res.meta.total);
      setCurrentPage(page);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load batches.';
      showToast(msg, 'error');
    } finally {
      setIsListLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load + tab switch
  useEffect(() => {
    setSearchQuery('');
    setBatchList([]);
    fetchBatches(1, '', activeTab, true);
  }, [activeTab]);

  // Pull-to-refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setSearchQuery('');
    setIsTyping(false);
    setBatchList([]);
    fetchBatches(1, '', activeTab, true, false);
  };

  // Search with 500ms debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setIsTyping(text.trim().length > 0);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setIsTyping(false);
      fetchBatches(1, text, activeTab, true);
    }, 500);
  };

  const handleLoadMore = () => {
    if (!isListLoading && batchList.length < totalCount) {
      fetchBatches(currentPage + 1, searchQuery, activeTab, false);
    }
  };

  const dismissSearch = () => {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    setIsSearchFocused(false);
  };

  // --- Create Batch ---
  const handleCreateBatch = async () => {
    const sy = parseInt(newStartYear, 10);
    const ey = parseInt(newEndYear, 10);
    const sem = parseInt(newSemester, 10);
    if (!newName.trim() || isNaN(sy) || isNaN(ey) || isNaN(sem)) return;
    Keyboard.dismiss();
    setIsCreating(true);
    try {
      await createBatch({ name: newName.trim(), startYear: sy, endYear: ey, currentSemester: sem });
      setNewName(''); setNewStartYear(''); setNewEndYear(''); setNewSemester('1');
      setCreateVisible(false);
      // Refetch so the full batch object (including _count) is returned
      await fetchBatches(1, searchQuery, activeTab, true, true);
      showToast('Batch created successfully!', 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to create batch.', 'error');
    } finally { setIsCreating(false); }
  };

  // --- View Batch Detail ---
  const handleViewBatch = async (id: string) => {
    setDetailVisible(true);
    setIsDetailLoading(true);
    setSelectedBatch(null);
    try {
      const detail = await getBatchById(id);
      setSelectedBatch(detail);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load batch.', 'error');
      setDetailVisible(false);
    } finally { setIsDetailLoading(false); }
  };

  // --- Open Tutor Picker ---
  const handleOpenTutorPicker = async () => {
    setTutorPickerVisible(true);
    setIsTutorLoading(true);
    setSelectedTutorId(null);
    try {
      const tutors = await getAvailableTutors();
      setAvailableTutors(tutors);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load tutors.', 'error');
      setTutorPickerVisible(false);
    } finally { setIsTutorLoading(false); }
  };

  // --- Assign Tutor ---
  const handleAssignTutor = async () => {
    if (!selectedBatch || !selectedTutorId) return;
    setIsAssigning(true);
    try {
      await assignTutor(selectedBatch.id, selectedTutorId);
      const updated = await getBatchById(selectedBatch.id);
      setSelectedBatch(updated);
      setBatchList(prev => prev.map(b => b.id === updated.id ? { ...b, tutor: updated.tutor, tutorId: updated.tutorId } : b));
      setTutorPickerVisible(false);
      showToast('Tutor assigned successfully!', 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to assign tutor.', 'error');
    } finally { setIsAssigning(false); }
  };

  // --- Promote Batch ---
  const handlePromote = async () => {
    if (!selectedBatch) return;
    setIsPromoting(true);
    try {
      const updated = await promoteBatch(selectedBatch.id);
      setBatchList(prev => prev.map(b => b.id === updated.id ? { ...b, currentSemester: updated.currentSemester } : b));
      setDetailVisible(false);
      showToast(`⬆ ${selectedBatch.name} promoted to ${ordinalSuffix(updated.currentSemester)} semester!`, 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to promote batch.', 'error');
    } finally { setIsPromoting(false); }
  };

  // --- Mark as Passed Out ---
  const handlePassout = async () => {
    if (!selectedBatch) return;
    setIsPassingOut(true);
    try {
      await passoutBatch(selectedBatch.id);
      // Remove from active list, close modal
      setBatchList(prev => prev.filter(b => b.id !== selectedBatch.id));
      setTotalCount(prev => prev - 1);
      setDetailVisible(false);
      showToast(`${selectedBatch.name} marked as passed out.`, 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to mark as passed out.', 'error');
    } finally { setIsPassingOut(false); }
  };

  // ─── Render Batch Card ───────────────────────────────────────────────────────

  const renderBatchItem = ({ item, index }: { item: Batch; index: number }) => {
    const color = getBatchColor(item.name);
    const initials = item.name
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <View style={[styles.card, index === 0 && { marginTop: 4 }]}>
        {/* Avatar */}
        <View style={[styles.cardAvatar, { backgroundColor: color.bg }]}>
          <Text style={[styles.cardAvatarText, { color: color.text }]}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <Text style={styles.batchName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.batchYears}>{item.startYear} – {item.endYear}</Text>

          {/* Badges row */}
          <View style={styles.badgeRow}>
            {/* Semester badge */}
            <View style={styles.semBadge}>
              <Text style={styles.semBadgeText}>{ordinalSuffix(item.currentSemester)} Sem</Text>
            </View>

            {/* Student count */}
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>👤 {item._count.students}</Text>
            </View>

            {/* Passed out pill */}
            {item.isPassedOut && (
              <View style={styles.passedOutBadge}>
                <Text style={styles.passedOutBadgeText}>Passed Out</Text>
              </View>
            )}
          </View>

          {/* Tutor row */}
          {item.tutor && (
            <Text style={styles.tutorText} numberOfLines={1}>
              🎓 {item.tutor.name}
            </Text>
          )}
        </View>

        {/* View button */}
        <TouchableOpacity style={styles.viewBtn} activeOpacity={0.7} onPress={() => handleViewBatch(item.id)}>
          <ViewIcon width={20} height={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Render Footer ───────────────────────────────────────────────────────────

  const renderFooter = () => {
    if (isListLoading && batchList.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      );
    }
    if (batchList.length < totalCount && !isListLoading) {
      return (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore} activeOpacity={0.8}>
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      );
    }
    if (!isListLoading && batchList.length > 0 && batchList.length >= totalCount) {
      return (
        <View style={styles.allLoadedBanner}>
          <View style={styles.dividerLine} />
          <Text style={styles.allLoadedText}>All {totalCount} batch{totalCount !== 1 ? 'es' : ''} loaded</Text>
          <View style={styles.dividerLine} />
        </View>
      );
    }
    return null;
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <TouchableWithoutFeedback onPress={dismissSearch}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
          <View>
            <Text style={styles.headerTitle}>Batches</Text>
            {totalCount > 0 && (
              <Text style={styles.headerSubtitle}>
                {totalCount} {activeTab === 'passedout' ? 'passed out' : 'active'} batch{totalCount !== 1 ? 'es' : ''}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.addButton} activeOpacity={0.85} onPress={() => setCreateVisible(true)}>
            <Text style={styles.addButtonText}>+ Create</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActiveStyle]}
          onPress={() => { if (activeTab !== 'active') setActiveTab('active'); }}
          activeOpacity={0.8}
        >
          <View style={[styles.tabDot, { backgroundColor: activeTab === 'active' ? '#22C55E' : COLORS.textTertiary }]} />
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'passedout' && styles.tabPassedOutStyle]}
          onPress={() => { if (activeTab !== 'passedout') setActiveTab('passedout'); }}
          activeOpacity={0.8}
        >
          <View style={[styles.tabDot, { backgroundColor: activeTab === 'passedout' ? '#8B5CF6' : COLORS.textTertiary }]} />
          <Text style={[styles.tabText, activeTab === 'passedout' && styles.tabTextPassedOut]}>Passed Out</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchContainer, isSearchFocused && styles.searchContainerFocused]}>
          <SearchIcon
            width={18}
            height={18}
            stroke={isSearchFocused ? COLORS.primary : COLORS.textSecondary}
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search batches..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => { handleSearchChange(''); setIsTyping(false); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Searching indicator */}
        {isTyping && searchQuery.trim().length > 0 && (
          <View style={styles.searchingBanner}>
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.searchingText}>
              Searching for <Text style={styles.searchingQuery}>"{searchQuery.trim()}"</Text>...
            </Text>
          </View>
        )}
      </View>

      {/* List */}
      {isListLoading && batchList.length === 0 ? (
        <ScrollView style={styles.listContent} showsVerticalScrollIndicator={false}>
          {[1, 2, 3, 4, 5].map((_, index) => (
            <View key={index} style={[styles.card, index === 0 && { marginTop: 4 }]}>
              <Skeleton width={52} height={52} borderRadius={16} />
              <View style={styles.cardBody}>
                <Skeleton width="60%" height={18} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={14} style={{ marginBottom: 12 }} />
                <View style={styles.badgeRow}>
                  <Skeleton width={60} height={24} borderRadius={12} />
                  <Skeleton width={50} height={24} borderRadius={12} style={{ marginLeft: 8 }} />
                </View>
                <Skeleton width="50%" height={14} style={{ marginTop: 12 }} />
              </View>
              <Skeleton width={32} height={32} borderRadius={16} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={batchList}
          keyExtractor={item => item.id}
          renderItem={renderBatchItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={dismissSearch}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <NotFoundIcon
                  width={48}
                  height={48}
                  color={searchQuery ? COLORS.primary : COLORS.textTertiary}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No results found' : activeTab === 'active' ? 'No active batches' : 'No passed out batches'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No batches matching "${searchQuery}"`
                  : activeTab === 'active'
                    ? 'Active batches will appear here'
                    : 'Graduated batches will appear here'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Create Batch Modal ── */}
      <Modal visible={createVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setCreateVisible(false)}>
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setCreateVisible(false); }}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) + keyboardPadding }]}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Create Batch</Text>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCreateVisible(false)}>
                    <Text style={styles.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Batch Name</Text>
                  <TextInput style={styles.modalInput} placeholder="e.g. CSE 2023-2027 A" placeholderTextColor={COLORS.textSecondary} value={newName} onChangeText={setNewName} editable={!isCreating} />
                </View>
                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Start Year</Text>
                    <TextInput style={styles.modalInput} placeholder="2023" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" maxLength={4} value={newStartYear} onChangeText={setNewStartYear} editable={!isCreating} />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.inputLabel}>End Year</Text>
                    <TextInput style={styles.modalInput} placeholder="2027" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" maxLength={4} value={newEndYear} onChangeText={setNewEndYear} editable={!isCreating} />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Starting Semester</Text>
                  <TextInput style={styles.modalInput} placeholder="1" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" maxLength={1} value={newSemester} onChangeText={setNewSemester} editable={!isCreating} />
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateVisible(false)} disabled={isCreating}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, (!newName.trim() || !newStartYear || !newEndYear || isCreating) && styles.saveBtnDisabled]}
                    onPress={handleCreateBatch}
                    disabled={!newName.trim() || !newStartYear || !newEndYear || isCreating}
                  >
                    {isCreating ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.saveBtnText}>Create Batch</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Batch Detail Modal ── */}
      <Modal visible={detailVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.detailOverlay}>
          {/* Pressable backdrop — tapping dim area closes modal */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetailVisible(false)} />
          {/* Sheet — plain View, no touch interceptor, so ScrollView works */}
          <View style={[styles.detailSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHandle} />
            {isDetailLoading ? (
              <View style={styles.detailLoader}><ActivityIndicator color={COLORS.primary} size="large" /><Text style={styles.loadingText}>Loading...</Text></View>
            ) : selectedBatch ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.detailScrollContent}
                bounces={true}
              >
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Batch Details</Text>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailVisible(false)}>
                    <Text style={styles.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
                {/* Avatar */}
                {(() => {
                  const c = getBatchColor(selectedBatch.name); const ini = selectedBatch.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); return (
                    <View style={styles.detailAvatarWrap}>
                      <View style={[styles.detailAvatar, { backgroundColor: c.bg }]}><Text style={[styles.detailAvatarText, { color: c.text }]}>{ini}</Text></View>
                    </View>
                  );
                })()}
                <Text style={styles.detailName}>{selectedBatch.name}</Text>
                <Text style={styles.detailYears}>{selectedBatch.startYear} – {selectedBatch.endYear}</Text>
                {/* Info card */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Department</Text><Text style={styles.infoValue}>{selectedBatch.department?.name ?? '—'}</Text></View>
                  <View style={styles.infoRowDivider} />
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Semester</Text><Text style={styles.infoValue}>{ordinalSuffix(selectedBatch.currentSemester)}</Text></View>
                  <View style={styles.infoRowDivider} />
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Students</Text><Text style={styles.infoValue}>{selectedBatch._count.students}</Text></View>
                  <View style={styles.infoRowDivider} />
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Subjects</Text><Text style={styles.infoValue}>{selectedBatch._count.subjectAssignments}</Text></View>
                  <View style={styles.infoRowDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <View style={[styles.badge, { backgroundColor: selectedBatch.isPassedOut ? '#F5F3FF' : '#ECFDF5' }]}>
                      <Text style={[styles.badgeText, { color: selectedBatch.isPassedOut ? '#7C3AED' : '#16A34A' }]}>{selectedBatch.isPassedOut ? 'Passed Out' : 'Active'}</Text>
                    </View>
                  </View>
                </View>
                {/* Tutor section */}
                <View style={styles.tutorSection}>
                  <Text style={styles.sectionLabel}>Class Tutor</Text>
                  {selectedBatch.tutor ? (
                    <View style={styles.tutorCard}>
                      <View style={[styles.tutorAvatar, { backgroundColor: getBatchColor(selectedBatch.tutor.name).bg }]}>
                        <Text style={[styles.tutorAvatarText, { color: getBatchColor(selectedBatch.tutor.name).text }]}>{selectedBatch.tutor.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tutorName}>{selectedBatch.tutor.name}</Text>
                        <Text style={styles.tutorEmail}>{selectedBatch.tutor.email}</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.noTutorText}>No tutor assigned yet</Text>
                  )}
                  {!selectedBatch.isPassedOut && (
                    <TouchableOpacity style={styles.assignBtn} onPress={handleOpenTutorPicker} activeOpacity={0.85}>
                      <Text style={styles.assignBtnText}>{selectedBatch.tutor ? 'Change Tutor' : 'Assign Tutor'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {/* Promote / Passout actions — active batches only */}
                {!selectedBatch.isPassedOut && (() => {
                  const maxSemester = (selectedBatch.endYear - selectedBatch.startYear) * 2;
                  const isAtMax = selectedBatch.currentSemester >= maxSemester;
                  return (
                    <View style={styles.batchActionsSection}>
                      <Text style={styles.sectionLabel}>Batch Actions</Text>
                      <View style={styles.semesterProgressRow}>
                        <Text style={styles.semesterProgressText}>
                          Semester{' '}
                          <Text style={styles.semesterProgressHighlight}>{selectedBatch.currentSemester}</Text>
                          {' '}of{' '}
                          <Text style={styles.semesterProgressHighlight}>{maxSemester}</Text>
                        </Text>
                        {isAtMax && (
                          <View style={styles.finalSemBadge}>
                            <Text style={styles.finalSemBadgeText}>Final Semester</Text>
                          </View>
                        )}
                      </View>
                      {isAtMax ? (
                        <TouchableOpacity
                          style={[styles.passoutBtn, isPassingOut && styles.actionBtnDisabled]}
                          onPress={() => setPassoutConfirmVisible(true)}
                          disabled={isPassingOut}
                          activeOpacity={0.85}
                        >
                          {isPassingOut
                            ? <ActivityIndicator color='#DC2626' size="small" />
                            : <Text style={styles.passoutBtnText}>🎓  Mark as Passed Out</Text>
                          }
                        </TouchableOpacity>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={[styles.promoteBtn, isPromoting && styles.actionBtnDisabled]}
                            onPress={() => setPromoteConfirmVisible(true)}
                            disabled={isPromoting || isPassingOut}
                            activeOpacity={0.85}
                          >
                            {isPromoting
                              ? <ActivityIndicator color={COLORS.primary} size="small" />
                              : <Text style={styles.promoteBtnText}>⬆  Promote to Next Semester</Text>
                            }
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.passoutBtn, isPassingOut && styles.actionBtnDisabled]}
                            onPress={() => setPassoutConfirmVisible(true)}
                            disabled={isPromoting || isPassingOut}
                            activeOpacity={0.85}
                          >
                            {isPassingOut
                              ? <ActivityIndicator color='#DC2626' size="small" />
                              : <Text style={styles.passoutBtnText}>🎓  Mark as Passed Out</Text>
                            }
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  );
                })()}
                {/* Subject assignments */}
                {selectedBatch.subjectAssignments.length > 0 && (
                  <View style={styles.subjectSection}>
                    <Text style={styles.sectionLabel}>Subject Assignments</Text>
                    {selectedBatch.subjectAssignments.map(sa => (
                      <View key={sa.id} style={styles.subjectRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.subjectName}>{sa.subject.name}</Text>
                          <Text style={styles.subjectCode}>{sa.subject.subjectCode}</Text>
                        </View>
                        <Text style={styles.subjectStaff} numberOfLines={1}>{sa.staff?.name ?? '—'}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>


      {/* ── Tutor Picker Modal ── */}
      <Modal visible={tutorPickerVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setTutorPickerVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setTutorPickerVisible(false)}>
          <View style={styles.detailOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.tutorPickerSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Select Tutor</Text>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setTutorPickerVisible(false)}>
                    <Text style={styles.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
                {isTutorLoading ? (
                  <View style={styles.detailLoader}><ActivityIndicator color={COLORS.primary} size="large" /></View>
                ) : availableTutors.length === 0 ? (
                  <View style={styles.detailLoader}>
                    <Text style={styles.noTutorText}>No available tutors found.</Text>
                    <Text style={styles.tutorEmail}>All active staff are already assigned.</Text>
                  </View>
                ) : (
                  <>
                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
                      {availableTutors.map(t => (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.tutorPickerRow, selectedTutorId === t.id && styles.tutorPickerRowSelected]}
                          onPress={() => setSelectedTutorId(t.id)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.tutorAvatar, { backgroundColor: getBatchColor(t.name).bg }]}>
                            <Text style={[styles.tutorAvatarText, { color: getBatchColor(t.name).text }]}>{t.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.tutorName}>{t.name}</Text>
                            <Text style={styles.tutorEmail}>{t.email}</Text>
                          </View>
                          {selectedTutorId === t.id && <View style={styles.tutorCheckDot} />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setTutorPickerVisible(false)} disabled={isAssigning}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveBtn, (!selectedTutorId || isAssigning) && styles.saveBtnDisabled]}
                        onPress={handleAssignTutor}
                        disabled={!selectedTutorId || isAssigning}
                      >
                        {isAssigning ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.saveBtnText}>Assign</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Passout Confirmation Dialog ── */}
      <Modal visible={passoutConfirmVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPassoutConfirmVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setPassoutConfirmVisible(false)}>
          <View style={styles.confirmOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.confirmDialog}>
                <View style={styles.confirmIconCircle}>
                  <Text style={styles.confirmIconText}>🎓</Text>
                </View>
                <Text style={styles.confirmTitle}>Mark as Passed Out?</Text>
                <Text style={styles.confirmMessage}>
                  <Text style={styles.confirmName}>{selectedBatch?.name}</Text>
                  {' will be permanently marked as passed out.\nThis action cannot be undone.'}
                </Text>
                <View style={styles.confirmDivider} />
                <View style={styles.confirmActions}>
                  <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setPassoutConfirmVisible(false)} activeOpacity={0.8}>
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <View style={styles.confirmBtnDivider} />
                  <TouchableOpacity
                    style={styles.confirmDeactivateBtn}
                    onPress={() => { setPassoutConfirmVisible(false); handlePassout(); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmDeactivateText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Promote Confirmation Dialog ── */}
      <Modal visible={promoteConfirmVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPromoteConfirmVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setPromoteConfirmVisible(false)}>
          <View style={styles.confirmOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.confirmDialog}>
                <View style={[styles.confirmIconCircle, { backgroundColor: COLORS.primaryLight, borderColor: '#C4C0FF' }]}>
                  <Text style={styles.confirmIconText}>⬆</Text>
                </View>
                <Text style={styles.confirmTitle}>Promote Batch?</Text>
                <Text style={styles.confirmMessage}>
                  <Text style={styles.confirmName}>{selectedBatch?.name}</Text>
                  {' will be moved to the next semester.\nThe modal will close after promotion.'}
                </Text>
                <View style={styles.confirmDivider} />
                <View style={styles.confirmActions}>
                  <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setPromoteConfirmVisible(false)} activeOpacity={0.8}>
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <View style={styles.confirmBtnDivider} />
                  <TouchableOpacity
                    style={styles.confirmDeactivateBtn}
                    onPress={() => { setPromoteConfirmVisible(false); handlePromote(); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.confirmDeactivateText, { color: COLORS.primary }]}>Promote</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

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
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 14,
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
  tabActiveStyle: {
    backgroundColor: '#ECFDF5',
  },
  tabPassedOutStyle: {
    backgroundColor: '#F5F3FF',
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
  tabTextPassedOut: {
    color: '#7C3AED',
    fontWeight: '700',
  },

  // Search
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchContainerFocused: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
    padding: 0,
  },
  clearIcon: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  searchingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  searchingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  searchingQuery: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Batch Card
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
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  cardAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cardBody: {
    flex: 1,
    marginRight: 8,
  },
  batchName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  batchYears: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  semBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  semBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  countBadge: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  passedOutBadge: {
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  passedOutBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  tutorText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  viewBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  // Footer
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreBtn: {
    marginHorizontal: 40,
    marginVertical: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  allLoadedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  allLoadedText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },

  // Loading / Empty
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Shared add button
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

  // Shared badge
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,18,35,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 20,
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
  inputGroup: {
    marginBottom: 18,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Detail sheet
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
  detailScrollContent: {
    paddingBottom: 32,
  },
  detailLoader: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
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
  detailYears: {
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
  },

  // Tutor section
  tutorSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  tutorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tutorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  tutorAvatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  tutorName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tutorEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  noTutorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 12,
  },
  assignBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  assignBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Subject assignments
  subjectSection: {
    marginBottom: 20,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subjectCode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  subjectStaff: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    maxWidth: 130,
  },

  // Tutor picker
  tutorPickerSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  tutorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  tutorPickerRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  tutorCheckDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
  },

  // Batch action buttons
  batchActionsSection: {
    marginBottom: 20,
  },
  semesterProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  semesterProgressText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  semesterProgressHighlight: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  finalSemBadge: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  finalSemBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  promoteBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  promoteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  passoutBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passoutBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },

  // Passout confirmation dialog
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 12, 28, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  confirmDialog: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingTop: 32,
    paddingBottom: 0,
    paddingHorizontal: 28,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 20,
  },
  confirmIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    borderWidth: 4,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  confirmIconText: {
    fontSize: 26,
    lineHeight: 32,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  confirmMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 28,
  },
  confirmName: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  confirmDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: -28,
  },
  confirmActions: {
    flexDirection: 'row',
    height: 56,
  },
  confirmCancelBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmBtnDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  confirmDeactivateBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDeactivateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
});

export default HODBatchesScreen;
