import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackIcon from '../../assets/svg/back.svg';
import { HackathonTeam, getHackathonTeams, registerHackathonTeam } from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

const HackathonDetailScreen = ({ route }: any) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const { hackathon, role, colorTheme } = route.params;

  // HOD / TUTOR State
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  useEffect(() => {
    if (role === 'HOD' || role === 'TUTOR') {
      fetchTeams();
    }
  }, []);

  const fetchTeams = async () => {
    try {
      setLoadingTeams(true);
      const teamData = await getHackathonTeams(hackathon.id);
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
            <BackIcon width={24} height={24} fill={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{hackathon.name}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hackathon Info */}
        {hackathon.thumbnailUrl && (
          <Image source={{ uri: hackathon.thumbnailUrl }} style={styles.heroImage} />
        )}
        
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{hackathon.name}</Text>
            <View style={[styles.badge, { backgroundColor: colorTheme.light }]}>
              <Text style={[styles.badgeTxt, { color: colorTheme.main }]}>
                {hackathon.isGroup ? `Group (${hackathon.minSize}-${hackathon.maxSize})` : 'Solo'}
              </Text>
            </View>
          </View>
          <Text style={styles.description}>{hackathon.description}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Reg Deadline</Text>
              <Text style={styles.statValue}>{new Date(hackathon.registrationDeadline).toLocaleDateString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Event Date</Text>
              <Text style={styles.statValue}>{new Date(hackathon.hackathonDate).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>

        {/* HOD / TUTOR Team List */}
        {(role === 'HOD' || role === 'TUTOR') && (
          <View style={styles.teamsSection}>
            <Text style={styles.sectionTitle}>Registered Teams</Text>
            
            {loadingTeams ? (
              <ActivityIndicator size="large" color={colorTheme.main} style={{ marginTop: 20 }} />
            ) : teams.length === 0 ? (
              <Text style={styles.emptyTxt}>No teams registered yet.</Text>
            ) : (
              teams.map(t => (
                <TouchableOpacity 
                  key={t.id} 
                  style={styles.teamCard} 
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('TeamDetail', { teamId: t.id, role, colorTheme })}
                >
                  <Text style={styles.teamName}>{t.teamName || 'Solo Participant'}</Text>
                  <Text style={[styles.ideaTitle, { color: colorTheme.main }]}>{t.ideaTitle}</Text>
                  <Text style={styles.ideaDesc} numberOfLines={2}>{t.ideaDescription}</Text>
                  
                  <View style={styles.teamStats}>
                    <Text style={styles.teamStatTxt}>Leader: {t.leader.user.name}</Text>
                    {t._count && t._count.members > 1 && (
                      <Text style={styles.teamStatTxt}>Members: {t._count.members}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* STUDENT Registration Button */}
        {role === 'STUDENT' && (
          <View style={styles.formSection}>
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: colorTheme.main }]} 
              onPress={() => navigation.navigate('StudentHackathonRegistration', { hackathon, colorTheme })}
            >
              <Text style={styles.submitBtnTxt}>Register Now</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>


    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.white, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, flex: 1, textAlign: 'center', marginHorizontal: 10 },
  scrollContent: { paddingBottom: 60 },
  
  heroImage: { width: '100%', height: 200, backgroundColor: COLORS.border },
  infoSection: { padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, flex: 1, marginRight: 10 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeTxt: { fontSize: 12, fontWeight: '700' },
  description: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 20 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16 },
  statItem: { flex: 1 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },

  teamsSection: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },
  emptyTxt: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 20 },
  
  teamCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  teamName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  ideaTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  ideaDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 20 },
  teamStats: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  teamStatTxt: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },

  formSection: { padding: 20 },
  submitBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  submitBtnTxt: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});

export default HackathonDetailScreen;
