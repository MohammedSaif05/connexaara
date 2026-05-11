import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const [selectedHackathon, setSelectedHackathon] = useState<Hackathon | null>(null);
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

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

  const handleSelectHackathon = async (h: Hackathon) => {
    setSelectedHackathon(h);
    try {
      setLoadingTeams(true);
      const teamData = await getHackathonTeams(h.id);
      setTeams(teamData);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load teams');
    } finally {
      setLoadingTeams(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backTxt}>←</Text>
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
          <ScrollView contentContainerStyle={styles.scrollList}>
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

      {/* Team Details Modal */}
      <Modal visible={!!selectedHackathon} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registered Teams</Text>
              <TouchableOpacity onPress={() => setSelectedHackathon(null)} style={styles.closeBtn}>
                <Text style={styles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingTeams ? (
              <ActivityIndicator size="large" color={COLORS.purple} style={{ margin: 40 }} />
            ) : (
              <ScrollView>
                {teams.length === 0 ? (
                  <Text style={styles.emptyTxt}>No teams registered yet.</Text>
                ) : (
                  teams.map(t => (
                    <View key={t.id} style={styles.teamCard}>
                      <Text style={styles.teamName}>{t.teamName || 'Solo Participant'}</Text>
                      <Text style={styles.ideaTitle}>{t.ideaTitle}</Text>
                      <Text style={styles.ideaDesc}>{t.ideaDescription}</Text>
                      
                      <View style={styles.teamStats}>
                        <Text style={styles.teamStatTxt}>Leader: {t.leader.user.name}</Text>
                        {t._count && t._count.members > 1 && (
                          <Text style={styles.teamStatTxt}>Members: {t._count.members}</Text>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.white, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 20 },
  backTxt: { fontSize: 20, color: COLORS.textPrimary },
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
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  closeTxt: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  teamCard: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16, marginBottom: 12 },
  teamName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  ideaTitle: { fontSize: 14, fontWeight: '600', color: COLORS.purple, marginBottom: 4 },
  ideaDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  teamStats: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  teamStatTxt: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
});

export default TutorHackathonsScreen;
