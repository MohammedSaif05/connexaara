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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/ToastContext';
import { getBatches, Batch, ApiError } from '../../services/api';
import SearchIcon from '../../assets/svg/search.svg';
import ViewIcon from '../../assets/svg/view.svg';
import NotFoundIcon from '../../assets/svg/not-found.svg';

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
    fetchBatches(1, '', activeTab, true, true);
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
        <TouchableOpacity style={styles.viewBtn} activeOpacity={0.7}>
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
        <View style={styles.centerLoader}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Fetching batches...</Text>
        </View>
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
});

export default HODBatchesScreen;
