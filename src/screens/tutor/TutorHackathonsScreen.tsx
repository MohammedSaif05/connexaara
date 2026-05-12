import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackIcon from '../../assets/svg/back.svg';
import { Hackathon, HackathonTeam, getHackathons, getHackathonTeams } from '../../services/api';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  purple: '#7B61FF',
  purpleLight: '#F0EDFF',
  orange: '#FF9800',
  orangeLight: '#FFF0D4',
  border: '#E5E7EB',
};

const TutorHackathonsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHackathons();
  }, []);

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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getHackathons();
      setHackathons(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to refresh hackathons');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectHackathon = (h: Hackathon) => {
    navigation.navigate('HackathonDetail', {
      hackathon: h,
      role: 'TUTOR',
      colorTheme: { main: COLORS.orange, light: COLORS.orangeLight }
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
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.purple} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView 
            contentContainerStyle={styles.scrollList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.purple]} />}
          >
            {hackathons.length === 0 ? (
              <Text style={styles.emptyTxt}>No hackathons available.</Text>
            ) : (
              hackathons.map(h => (
                <TouchableOpacity key={h.id} style={styles.card} activeOpacity={0.8} onPress={() => handleSelectHackathon(h)}>
                  {h.thumbnailUrl && (
                    <Image source={{ uri: h.thumbnailUrl }} style={styles.cardImage} />
                  )}
                  <View style={styles.cardBody}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{h.name}</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeTxt}>{h.isGroup ? 'Group' : 'Solo'}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardDesc} numberOfLines={2}>{h.description}</Text>
                    
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Teams Registered</Text>
                        <Text style={styles.statValue}>{h._count?.teams || 0}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Hackathon Date</Text>
                        <Text style={styles.statValue}>{new Date(h.hackathonDate).toLocaleDateString()}</Text>
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

export default TutorHackathonsScreen;
