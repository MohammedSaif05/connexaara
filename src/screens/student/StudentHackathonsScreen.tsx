import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Image, TextInput, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackIcon from '../../assets/svg/back.svg';
import { Hackathon, getHackathons, getMyTeams } from '../../services/api';
import Skeleton from '../../components/Skeleton';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
  danger: '#EF4444',
  border: '#E5E7EB',
};

const StudentHackathonsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'DISCOVER' | 'MY_TEAMS'>('DISCOVER');
  
  // Discover State
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // My Teams State
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [loadingMyTeams, setLoadingMyTeams] = useState(false);

  useEffect(() => {
    if (activeTab === 'DISCOVER') fetchHackathons();
    else fetchMyTeams();
  }, [activeTab]);

  const fetchHackathons = async () => {
    try {
      setLoading(true);
      const data = await getHackathons();
      setHackathons(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load hackathons');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTeams = async () => {
    try {
      setLoadingMyTeams(true);
      const data = await getMyTeams();
      setMyTeams(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load your teams');
    } finally {
      setLoadingMyTeams(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'DISCOVER') {
        const data = await getHackathons();
        setHackathons(data);
      } else {
        const data = await getMyTeams();
        setMyTeams(data);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectHackathon = (h: Hackathon) => {
    navigation.navigate('HackathonDetail', {
      hackathon: h,
      role: 'STUDENT',
      colorTheme: { main: COLORS.blue, light: COLORS.blueLight }
    });
  };

  const handleSelectTeam = (teamId: string) => {
    navigation.navigate('TeamDetail', {
      teamId,
      role: 'STUDENT',
      colorTheme: { main: COLORS.blue, light: COLORS.blueLight }
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
          <Text style={styles.headerTitle}>Hackathons</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'DISCOVER' && styles.activeTab]}
            onPress={() => setActiveTab('DISCOVER')}
          >
            <Text style={[styles.tabText, activeTab === 'DISCOVER' && styles.activeTabText]}>Discover</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'MY_TEAMS' && styles.activeTab]}
            onPress={() => setActiveTab('MY_TEAMS')}
          >
            <Text style={[styles.tabText, activeTab === 'MY_TEAMS' && styles.activeTabText]}>My Teams</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'DISCOVER' ? (
          loading ? (
            <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
              {[1, 2].map((_, index) => (
                <View key={index} style={styles.card}>
                  <Skeleton width="100%" height={140} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardHeaderRow}>
                      <Skeleton width="60%" height={20} />
                      <Skeleton width={50} height={24} borderRadius={8} />
                    </View>
                    <Skeleton width="100%" height={16} style={{ marginBottom: 6 }} />
                    <Skeleton width="80%" height={16} style={{ marginBottom: 16 }} />
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Skeleton width={100} height={12} style={{ marginBottom: 4 }} />
                        <Skeleton width={80} height={16} />
                      </View>
                      <View style={styles.statItem}>
                        <Skeleton width={100} height={12} style={{ marginBottom: 4 }} />
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
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.blue]} />}
            >
              {hackathons.length === 0 ? (
                <Text style={styles.emptyTxt}>No active hackathons found.</Text>
              ) : (
                hackathons.map(h => (
                  <TouchableOpacity key={h.id} style={styles.card} activeOpacity={0.8} onPress={() => handleSelectHackathon(h)}>
                    {h.thumbnailUrl && <Image source={{ uri: h.thumbnailUrl }} style={styles.cardImage} />}
                    <View style={styles.cardBody}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>{h.name}</Text>
                        <View style={styles.badge}>
                          <Text style={styles.badgeTxt}>{h.isGroup ? `Group (${h.minSize}-${h.maxSize})` : 'Solo'}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardDesc} numberOfLines={2}>{h.description}</Text>
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Reg Deadline</Text>
                          <Text style={styles.statValue}>{new Date(h.registrationDeadline).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Event Date</Text>
                          <Text style={styles.statValue}>{new Date(h.hackathonDate).toLocaleDateString()}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )
        ) : (
          loadingMyTeams ? (
            <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
              {[1, 2, 3].map((_, index) => (
                <View key={index} style={styles.card}>
                  <View style={styles.cardBody}>
                    <Skeleton width="70%" height={20} style={{ marginBottom: 8 }} />
                    <Skeleton width="50%" height={16} style={{ marginBottom: 4 }} />
                    <Skeleton width="60%" height={14} />
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView 
              contentContainerStyle={styles.scrollList}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.blue]} />}
            >
              {myTeams.length === 0 ? (
                <Text style={styles.emptyTxt}>You haven't registered for any hackathons yet.</Text>
              ) : (
                myTeams.map(t => (
                  <TouchableOpacity key={t.id} style={styles.card} activeOpacity={0.8} onPress={() => handleSelectTeam(t.id)}>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{t.hackathon?.name}</Text>
                      <Text style={[styles.cardDesc, { marginTop: 4, color: COLORS.blue, fontWeight: '600' }]}>{t.teamName || 'Solo Participation'}</Text>
                      <Text style={styles.cardDesc}>Leader: {t.leader?.user?.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.white, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  tabContainer: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  activeTabText: { color: COLORS.blue },
  content: { flex: 1 },
  scrollList: { padding: 20 },
  emptyTxt: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardImage: { width: '100%', height: 140, backgroundColor: COLORS.border },
  cardBody: { padding: 16 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  badge: { backgroundColor: COLORS.blueLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTxt: { color: COLORS.blue, fontSize: 12, fontWeight: '700' },
  cardDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  statItem: { flex: 1 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
});

export default StudentHackathonsScreen;
