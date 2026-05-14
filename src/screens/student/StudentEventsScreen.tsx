import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackIcon from '../../assets/svg/back.svg';
import { Event, getEvents } from '../../services/api';
import Skeleton from '../../components/Skeleton';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  purple: '#7B61FF',
  purpleLight: '#F3F0FF',
  border: '#E5E7EB',
};

const StudentEventsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getEvents();
      setEvents(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to refresh events');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectEvent = (e: Event) => {
    navigation.navigate('EventDetail', {
      event: e,
      role: 'STUDENT',
      colorTheme: { main: COLORS.purple, light: COLORS.purpleLight }
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <BackIcon width={24} height={24} fill={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Campus Events</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
            {[1, 2, 3].map((_, index) => (
              <View key={index} style={styles.card}>
                <Skeleton width="100%" height={140} />
                <View style={styles.cardBody}>
                  <View style={styles.cardHeaderRow}>
                    <Skeleton width="60%" height={20} />
                    <Skeleton width={80} height={24} borderRadius={8} />
                  </View>
                  <Skeleton width="100%" height={16} style={{ marginBottom: 6 }} />
                  <Skeleton width="80%" height={16} style={{ marginBottom: 16 }} />
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Skeleton width={80} height={12} style={{ marginBottom: 4 }} />
                      <Skeleton width={80} height={16} />
                    </View>
                    <View style={styles.statItem}>
                      <Skeleton width={80} height={12} style={{ marginBottom: 4 }} />
                      <Skeleton width={80} height={16} />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <ScrollView 
            contentContainerStyle={styles.scrollList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.purple]} />}
          >
            {events.length === 0 ? (
              <Text style={styles.emptyTxt}>No events available at the moment.</Text>
            ) : (
              events.map(e => (
                <TouchableOpacity key={e.id} style={styles.card} activeOpacity={0.8} onPress={() => handleSelectEvent(e)}>
                  {e.thumbnailUrl && (
                    <Image source={{ uri: e.thumbnailUrl }} style={styles.cardImage} />
                  )}
                  <View style={styles.cardBody}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{e.name}</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeTxt}>{e.department?.name || 'College'}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardDesc} numberOfLines={2}>{e.description}</Text>
                    
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Start Date</Text>
                        <Text style={styles.statValue}>{new Date(e.startDate).toLocaleDateString()}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>End Date</Text>
                        <Text style={styles.statValue}>{new Date(e.endDate).toLocaleDateString()}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.white, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  content: { flex: 1 },
  scrollList: { padding: 20, paddingBottom: 60 },
  emptyTxt: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardImage: { width: '100%', height: 140, backgroundColor: COLORS.border },
  cardBody: { padding: 16 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  badge: { backgroundColor: COLORS.purpleLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTxt: { color: COLORS.purple, fontSize: 12, fontWeight: '700' },
  cardDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  statItem: { flex: 1 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
});

export default StudentEventsScreen;
