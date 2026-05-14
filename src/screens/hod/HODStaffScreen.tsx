import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ActivityIndicator,
  RefreshControl,
  Switch,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/ToastContext';
import { getStaff, createStaff, getStaffById, updateStaff, deactivateStaff, activateStaff, StaffMember, StaffDetail, ApiError } from '../../services/api';
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
  teal: '#2EC4B6',
  tealLight: '#E6FAF8',
  border: '#E8EBF0',
  inputBg: '#F7F8FC',
  cardBg: '#FFFFFF',
  activeDot: '#22C55E',
  shadow: '#A0A3B1',
};

// Soft color palette for avatars (cycles through based on name)
const AVATAR_PALETTE = [
  { bg: '#EEF0FF', text: '#6C63FF' },
  { bg: '#FFF0F6', text: '#F472B6' },
  { bg: '#ECFDF5', text: '#10B981' },
  { bg: '#FFF7ED', text: '#F97316' },
  { bg: '#EFF6FF', text: '#3B82F6' },
  { bg: '#FDF4FF', text: '#A855F7' },
];

const getAvatarColor = (name: string) => {
  const index = name.charCodeAt(0) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
};

const PAGE_LIMIT = 10;

const HODStaffScreen = () => {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  // --- List State ---
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListLoading, setIsListLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // true while debounce is pending

  // --- Add Staff Modal State ---
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- Detail / Edit Modal State ---
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editIsTutor, setEditIsTutor] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'activate' | 'deactivate'>('deactivate');

  // --- Active/Inactive Tab ---
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

  // Keyboard tracking for Android modal bug
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  // Debounce timer ref for search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to programmatically blur the search input
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (Platform.OS === 'ios') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardPadding(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardPadding(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // --- Data Fetching ---
  const fetchStaff = useCallback(async (page: number, search: string, tab: 'active' | 'inactive', reset = false, silent = false) => {
    if (!silent) setIsListLoading(true);
    try {
      const res = await getStaff(page, PAGE_LIMIT, search, tab === 'active');
      setStaffList(prev => reset ? res.data : [...prev, ...res.data]);
      setTotalCount(res.meta.total);
      setCurrentPage(page);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load staff.';
      showToast(msg, 'error');
    } finally {
      setIsListLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStaff(1, '', activeTab, true);
  }, [activeTab]);

  // Pull-to-refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setSearchQuery('');
    setStaffList([]);
    fetchStaff(1, '', activeTab, true, false);
  };

  // Search with 500ms debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.trim()) {
      setIsTyping(true); // Show 'Searching for...' immediately
    } else {
      setIsTyping(false);
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setIsTyping(false);
      fetchStaff(1, text, activeTab, true);
    }, 500);
  };

  const handleLoadMore = () => {
    if (!isListLoading) {
      fetchStaff(currentPage + 1, searchQuery, activeTab, false);
    }
  };

  // --- Add Staff ---
  const handleAddStaff = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    Keyboard.dismiss();
    setIsSaving(true);
    try {
      const created = await createStaff(newName.trim(), newEmail.trim());
      setStaffList(prev => [created, ...prev]);
      setTotalCount(prev => prev + 1);
      setNewName('');
      setNewEmail('');
      setModalVisible(false);
      showToast('Staff member added successfully!', 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to add staff. Please try again.';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- View Staff Detail ---
  const handleViewStaff = async (id: string) => {
    setDetailVisible(true);
    setIsDetailLoading(true);
    setSelectedStaff(null);
    setIsEditMode(false);
    try {
      const detail = await getStaffById(id);
      setSelectedStaff(detail);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load staff details.';
      showToast(msg, 'error');
      setDetailVisible(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const openEditMode = () => {
    if (!selectedStaff) return;
    setEditName(selectedStaff.name);
    setEditEmail(selectedStaff.email);
    setEditIsTutor(selectedStaff.isTutor);
    setIsEditMode(true);
  };

  // --- Update Staff ---
  const handleUpdateStaff = async () => {
    if (!selectedStaff || !editName.trim() || !editEmail.trim()) return;
    Keyboard.dismiss();
    setIsUpdating(true);
    try {
      const updated = await updateStaff(selectedStaff.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        isTutor: editIsTutor,
      });
      setSelectedStaff(updated);
      // Update the card in the list without re-fetching
      setStaffList(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
      setIsEditMode(false);
      showToast('Staff updated successfully!', 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update staff.';
      showToast(msg, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Deactivate Staff ---
  const handleDeactivate = async () => {
    if (!selectedStaff) return;
    setIsDeactivating(true);
    try {
      await deactivateStaff(selectedStaff.id);
      // Remove from active list and close modal
      setStaffList(prev => prev.filter(s => s.id !== selectedStaff.id));
      setTotalCount(prev => prev - 1);
      setDetailVisible(false);
      setIsEditMode(false);
      showToast(`${selectedStaff.name} has been deactivated.`, 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to deactivate staff.';
      showToast(msg, 'error');
    } finally {
      setIsDeactivating(false);
    }
  };

  // --- Activate Staff ---
  const handleActivate = async () => {
    if (!selectedStaff) return;
    setIsActivating(true);
    try {
      await activateStaff(selectedStaff.id);
      // Remove from inactive list and close modal
      setStaffList(prev => prev.filter(s => s.id !== selectedStaff.id));
      setTotalCount(prev => prev - 1);
      setDetailVisible(false);
      showToast(`${selectedStaff.name} has been activated.`, 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to activate staff.';
      showToast(msg, 'error');
    } finally {
      setIsActivating(false);
    }
  };

  const hasMore = staffList.length < totalCount;

  // --- Render Items ---
  const renderStaffItem = ({ item, index }: { item: StaffMember; index: number }) => {
    const avatarColor = getAvatarColor(item.name);
    const initials = item.name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <View style={[styles.card, index === 0 && { marginTop: 4 }]}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
          <Text style={[styles.avatarText, { color: avatarColor.text }]}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <Text style={styles.staffName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.staffEmail} numberOfLines={1}>{item.email}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: item.isActive ? '#ECFDF5' : '#FEF2F2' }]}>
              <View style={[styles.badgeDot, { backgroundColor: item.isActive ? '#22C55E' : '#EF4444' }]} />
              <Text style={[styles.badgeText, { color: item.isActive ? '#16A34A' : '#DC2626' }]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            {item.isTutor && (
              <View style={[styles.badge, { backgroundColor: COLORS.primaryLight, marginLeft: 6 }]}>
                <Text style={[styles.badgeText, { color: COLORS.primary }]}>Tutor</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action */}
        <TouchableOpacity style={styles.viewBtn} activeOpacity={0.7} onPress={() => handleViewStaff(item.id)}>
          <ViewIcon width={20} height={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooter = () => {
    if (isListLoading && staffList.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={COLORS.primary} size="small" />
        </View>
      );
    }
    if (hasMore && !isListLoading) {
      return (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore} activeOpacity={0.8}>
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      );
    }
    if (!hasMore && staffList.length > 0) {
      return (
        <View style={styles.allLoadedBanner}>
          <View style={styles.dividerLine} />
          <Text style={styles.allLoadedText}>All {totalCount} members loaded</Text>
          <View style={styles.dividerLine} />
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header — tapping here dismisses the search keyboard */}
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); searchInputRef.current?.blur(); setIsSearchFocused(false); }}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>Staff Members</Text>
          {totalCount > 0 && (
            <Text style={styles.headerSubtitle}>
              {totalCount} total member{totalCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.85}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      </TouchableWithoutFeedback>

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
            placeholder="Search by name or email..."
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

        {/* Searching indicator — shows between keypress and API response */}
        {isTyping && searchQuery.trim().length > 0 && (
          <View style={styles.searchingBanner}>
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.searchingText}>
              Searching for <Text style={styles.searchingQuery}>"{searchQuery.trim()}"</Text>...
            </Text>
          </View>
        )}
      </View>

      {/* Active / Inactive Tabs */}
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
          style={[styles.tab, activeTab === 'inactive' && styles.tabInactive]}
          onPress={() => { if (activeTab !== 'inactive') { setSearchQuery(''); setActiveTab('inactive'); } }}
          activeOpacity={0.8}
        >
          <View style={[styles.tabDot, { backgroundColor: activeTab === 'inactive' ? '#EF4444' : COLORS.textTertiary }]} />
          <Text style={[styles.tabText, activeTab === 'inactive' && styles.tabTextInactive]}>Deactivated</Text>
        </TouchableOpacity>
      </View>

      {/* Initial Loading State */}
      {isListLoading && staffList.length === 0 ? (
        <ScrollView style={styles.listContent} showsVerticalScrollIndicator={false}>
          {[1, 2, 3, 4, 5].map((_, index) => (
            <View key={index} style={[styles.card, index === 0 && { marginTop: 4 }]}>
              <Skeleton width={48} height={48} borderRadius={24} />
              <View style={styles.cardBody}>
                <Skeleton width="60%" height={18} style={{ marginBottom: 6 }} />
                <Skeleton width="80%" height={14} style={{ marginBottom: 12 }} />
                <View style={styles.badgeRow}>
                  <Skeleton width={60} height={24} borderRadius={12} />
                  <Skeleton width={50} height={24} borderRadius={12} style={{ marginLeft: 6 }} />
                </View>
              </View>
              <Skeleton width={20} height={20} borderRadius={10} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={staffList}
          keyExtractor={(item) => item.id}
          renderItem={renderStaffItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => { Keyboard.dismiss(); searchInputRef.current?.blur(); setIsSearchFocused(false); }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
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
                {searchQuery ? 'No results found' : 'No staff yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No staff matching "${searchQuery}"`
                  : 'Tap + Add to onboard your first staff member'}
              </Text>
            </View>
          }
          ListFooterComponent={renderFooter}
        />
      )}

      {/* Add Staff Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setModalVisible(false); }}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) + keyboardPadding }]}>
                {/* Modal Handle */}
                <View style={styles.modalHandle} />

                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New Staff</Text>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeModalText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Prof. John Doe"
                    placeholderTextColor={COLORS.textSecondary}
                    value={newName}
                    onChangeText={setNewName}
                    editable={!isSaving}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. john.doe@university.edu"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={newEmail}
                    onChangeText={setNewEmail}
                    editable={!isSaving}
                    onSubmitEditing={handleAddStaff}
                    returnKeyType="done"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setModalVisible(false)}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      (!newName.trim() || !newEmail.trim() || isSaving) && styles.saveBtnDisabled
                    ]}
                    onPress={handleAddStaff}
                    disabled={!newName.trim() || !newEmail.trim() || isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>Add Staff Member</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Staff Detail / Edit Modal ── */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => { setDetailVisible(false); setIsEditMode(false); }}
      >
        <TouchableWithoutFeedback onPress={() => { if (!isEditMode) { setDetailVisible(false); } else { Keyboard.dismiss(); } }}>
          <View style={styles.detailOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.detailSheet, { paddingBottom: Math.max(insets.bottom, 24) + (isEditMode ? keyboardPadding : 0) }]}>

                {/* Handle */}
                <View style={styles.modalHandle} />

                {isDetailLoading ? (
                  <View style={styles.detailLoader}>
                    <ActivityIndicator color={COLORS.primary} size="large" />
                    <Text style={styles.loadingText}>Loading details...</Text>
                  </View>
                ) : selectedStaff ? (
                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Header row */}
                    <View style={styles.detailHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailSheetTitle}>
                          {isEditMode ? 'Edit Staff' : 'Staff Profile'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.closeDetailBtn}
                        onPress={() => { setDetailVisible(false); setIsEditMode(false); }}
                      >
                        <Text style={styles.closeDetailText}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Avatar */}
                    {(() => {
                      const avatarColor = getAvatarColor(selectedStaff.name);
                      const initials = selectedStaff.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                      return (
                        <View style={styles.detailAvatarWrap}>
                          <View style={[styles.detailAvatar, { backgroundColor: avatarColor.bg }]}>
                            <Text style={[styles.detailAvatarText, { color: avatarColor.text }]}>{initials}</Text>
                          </View>
                          <View style={[styles.detailActiveDot, { backgroundColor: selectedStaff.isActive ? '#22C55E' : '#EF4444' }]} />
                        </View>
                      );
                    })()}

                    {isEditMode ? (
                      /* ── Edit Form ── */
                      <View style={styles.editForm}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Full Name</Text>
                          <TextInput
                            style={styles.modalInput}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Staff name"
                            placeholderTextColor={COLORS.textSecondary}
                            editable={!isUpdating}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Email Address</Text>
                          <TextInput
                            style={styles.modalInput}
                            value={editEmail}
                            onChangeText={setEditEmail}
                            placeholder="Email address"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!isUpdating}
                          />
                        </View>
                        <View style={styles.tutorToggleRow}>
                          <View>
                            <Text style={styles.inputLabel}>Mark as Tutor</Text>
                            <Text style={styles.tutorToggleSub}>Allows this staff to manage a student batch</Text>
                          </View>
                          <Switch
                            value={editIsTutor}
                            onValueChange={setEditIsTutor}
                            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                            thumbColor={editIsTutor ? COLORS.primary : COLORS.textTertiary}
                            disabled={isUpdating}
                          />
                        </View>
                        {/* Deactivate — only shown when staff is currently active */}
                        {selectedStaff.isActive && (
                          <TouchableOpacity
                            style={[styles.deactivateBtn, (isDeactivating || isUpdating) && styles.saveBtnDisabled]}
                            onPress={() => { setConfirmAction('deactivate'); setConfirmVisible(true); }}
                            disabled={isDeactivating || isUpdating}
                            activeOpacity={0.85}
                          >
                            {isDeactivating ? (
                              <ActivityIndicator color='#DC2626' size="small" />
                            ) : (
                              <Text style={styles.deactivateBtnText}>Deactivate Staff</Text>
                            )}
                          </TouchableOpacity>
                        )}
                        <View style={styles.editActions}>
                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => setIsEditMode(false)}
                            disabled={isUpdating || isDeactivating}
                          >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.saveBtn,
                              (!editName.trim() || !editEmail.trim() || isUpdating || isDeactivating) && styles.saveBtnDisabled
                            ]}
                            onPress={handleUpdateStaff}
                            disabled={!editName.trim() || !editEmail.trim() || isUpdating || isDeactivating}
                          >
                            {isUpdating ? (
                              <ActivityIndicator color={COLORS.white} size="small" />
                            ) : (
                              <Text style={styles.saveBtnText}>Save Changes</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      /* ── Detail View ── */
                      <View style={styles.detailBody}>
                        <Text style={styles.detailName}>{selectedStaff.name}</Text>
                        <Text style={styles.detailEmail}>{selectedStaff.email}</Text>

                        {/* Info Rows */}
                        <View style={styles.infoCard}>
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Status</Text>
                            <View style={[styles.badge, { backgroundColor: selectedStaff.isActive ? '#ECFDF5' : '#FEF2F2' }]}>
                              <View style={[styles.badgeDot, { backgroundColor: selectedStaff.isActive ? '#22C55E' : '#EF4444' }]} />
                              <Text style={[styles.badgeText, { color: selectedStaff.isActive ? '#16A34A' : '#DC2626' }]}>
                                {selectedStaff.isActive ? 'Active' : 'Inactive'}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.infoRowDivider} />
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Role</Text>
                            <View style={[styles.badge, { backgroundColor: selectedStaff.isTutor ? COLORS.primaryLight : COLORS.inputBg }]}>
                              <Text style={[styles.badgeText, { color: selectedStaff.isTutor ? COLORS.primary : COLORS.textSecondary }]}>
                                {selectedStaff.isTutor ? 'Tutor' : 'Staff'}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.infoRowDivider} />
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Department</Text>
                            <Text style={styles.infoValue}>
                              {selectedStaff.department?.name ?? '—'}
                            </Text>
                          </View>
                          <View style={styles.infoRowDivider} />
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Joined</Text>
                            <Text style={styles.infoValue}>
                              {new Date(selectedStaff.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                          </View>
                        </View>

                        {/* Edit button — only for active staff */}
                        {selectedStaff.isActive ? (
                          <TouchableOpacity style={styles.editBtn} onPress={openEditMode} activeOpacity={0.85}>
                            <EditIcon width={18} height={18} color={COLORS.white} style={{ marginRight: 8 }} />
                            <Text style={styles.editBtnText}>Edit Staff</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.activateBtn}
                            onPress={() => { setConfirmAction('activate'); setConfirmVisible(true); }}
                            disabled={isActivating}
                            activeOpacity={0.85}
                          >
                            {isActivating ? (
                              <ActivityIndicator color='#16A34A' size="small" />
                            ) : (
                              <Text style={styles.activateBtnText}>✓  Activate Staff</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </ScrollView>
                ) : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Confirmation Dialog ── */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setConfirmVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setConfirmVisible(false)}>
          <View style={styles.confirmOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.confirmDialog}>
                <View style={[
                  styles.confirmIconCircle,
                  confirmAction === 'activate' && { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' }
                ]}>
                  <Text style={[styles.confirmIconText, confirmAction === 'activate' && { color: '#16A34A' }]}>
                    {confirmAction === 'activate' ? '✓' : '!'}
                  </Text>
                </View>

                <Text style={styles.confirmTitle}>
                  {confirmAction === 'activate' ? 'Activate Staff?' : 'Deactivate Staff?'}
                </Text>
                <Text style={styles.confirmMessage}>
                  <Text style={styles.confirmName}>{selectedStaff?.name}</Text>
                  {confirmAction === 'activate'
                    ? ' will regain full access to the system.'
                    : ' will lose all access to the system.\nThis action can be undone.'}
                </Text>

                <View style={styles.confirmDivider} />
                <View style={styles.confirmActions}>
                  <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmVisible(false)} activeOpacity={0.8}>
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <View style={styles.confirmBtnDivider} />
                  <TouchableOpacity
                    style={styles.confirmDeactivateBtn}
                    onPress={() => { setConfirmVisible(false); confirmAction === 'activate' ? handleActivate() : handleDeactivate(); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.confirmDeactivateText, confirmAction === 'activate' && { color: '#16A34A' }]}>
                      {confirmAction === 'activate' ? 'Activate' : 'Deactivate'}
                    </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },

  // --- Search ---
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
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
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  clearIcon: {
    fontSize: 13,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.border,
    borderRadius: 10,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
    overflow: 'hidden',
  },

  // --- List ---
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cardBody: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  staffEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 7,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  viewBtn: {
    paddingLeft: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- Footer ---
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreBtn: {
    marginTop: 4,
    marginBottom: 8,
    marginHorizontal: 20,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  loadMoreText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  allLoadedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  allLoadedText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // --- Empty State ---
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 12,
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

  // --- Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 18, 35, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
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
  modalInput: {
    backgroundColor: COLORS.inputBg,
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 54,
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
    height: 54,
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
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },

  // --- Detail / Edit Modal ---
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 18, 35, 0.55)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    maxHeight: '85%',
  },
  detailLoader: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailSheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  closeDetailBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeDetailText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  detailAvatarWrap: {
    alignSelf: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  detailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailAvatarText: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
  },
  detailActiveDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  detailBody: {
    paddingBottom: 16,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  detailEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
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
  editBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  editBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  editForm: {
    paddingBottom: 8,
  },
  tutorToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 20,
  },
  tutorToggleSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 3,
    maxWidth: '80%',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  deactivateBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginBottom: 12,
  },
  deactivateBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
  activateBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    marginBottom: 8,
  },
  activateBtnText: {
    color: '#16A34A',
    fontSize: 16,
    fontWeight: '700',
  },

  // --- Tabs ---
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

  // --- Custom Confirmation Dialog ---
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
    fontSize: 28,
    fontWeight: '800',
    color: '#DC2626',
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

export default HODStaffScreen;
