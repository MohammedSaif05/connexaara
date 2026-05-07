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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/ToastContext';
import { getStaff, createStaff, StaffMember, ApiError } from '../../services/api';

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

  // --- Add Staff Modal State ---
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Keyboard tracking for Android modal bug
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  // Debounce timer ref for search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Platform.OS === 'ios') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardPadding(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardPadding(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // --- Data Fetching ---
  const fetchStaff = useCallback(async (page: number, search: string, reset = false, silent = false) => {
    if (!silent) setIsListLoading(true);
    try {
      const res = await getStaff(page, PAGE_LIMIT, search);
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
    fetchStaff(1, '', true);
  }, []);

  // Pull-to-refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setSearchQuery('');
    fetchStaff(1, '', true, true);
  };

  // Search with 500ms debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchStaff(1, text, true);
    }, 500);
  };

  const handleLoadMore = () => {
    if (!isListLoading) {
      fetchStaff(currentPage + 1, searchQuery, false);
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
        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.6}>
          <View style={styles.moreDot} />
          <View style={styles.moreDot} />
          <View style={styles.moreDot} />
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
          <Text style={styles.loadMoreText}>Load 10 More</Text>
          <Text style={styles.loadMoreCount}>
            {staffList.length} of {totalCount}
          </Text>
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

      {/* Header */}
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

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchContainer, isSearchFocused && styles.searchContainerFocused]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
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
              onPress={() => handleSearchChange('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Initial Loading State */}
      {isListLoading && staffList.length === 0 ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Fetching staff...</Text>
        </View>
      ) : (
        <FlatList
          data={staffList}
          keyExtractor={(item) => item.id}
          renderItem={renderStaffItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
              <Text style={styles.emptyEmoji}>👥</Text>
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
  moreBtn: {
    paddingLeft: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  moreDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textTertiary,
    marginBottom: 3,
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
    flexDirection: 'row',
    gap: 12,
  },
  loadMoreText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  loadMoreCount: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
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
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
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
});

export default HODStaffScreen;
