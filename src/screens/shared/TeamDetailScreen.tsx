import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackIcon from '../../assets/svg/back.svg';
import { getTeamDetails, addHackathonProgress } from '../../services/api';
import { useNavigation } from '@react-navigation/native';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

const TeamDetailScreen = ({ route }: any) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const { teamId, role, colorTheme } = route.params;

  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [progressDesc, setProgressDesc] = useState('');
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);

  useEffect(() => {
    fetchTeamDetails();
  }, []);

  const fetchTeamDetails = async () => {
    try {
      setLoading(true);
      const data = await getTeamDetails(teamId);
      setTeam(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load team details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAddProgress = async () => {
    if (!progressDesc.trim()) return;
    setIsSubmittingProgress(true);
    try {
      await addHackathonProgress(team.id, {
        description: progressDesc,
        date: new Date().toISOString(),
      });
      setProgressDesc('');
      fetchTeamDetails(); // refresh
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add progress');
    } finally {
      setIsSubmittingProgress(false);
    }
  };

  if (loading || !team) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colorTheme.main} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <BackIcon width={24} height={24} fill={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{team.teamName || 'Team Details'}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Team Idea Section */}
        <View style={[styles.ideaSection, { backgroundColor: colorTheme.light }]}>
          <Text style={[styles.ideaTitle, { color: colorTheme.main }]}>{team.ideaTitle}</Text>
          <Text style={styles.ideaDesc}>{team.ideaDescription}</Text>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Members</Text>
          <View style={styles.membersCard}>
            <View style={styles.memberRow}>
              <View>
                <Text style={styles.memberName}>{team.leader?.user?.name} <Text style={[styles.leaderBadge, { color: colorTheme.main }]}>(Leader)</Text></Text>
                <Text style={styles.memberReg}>{team.leader?.registerNumber}</Text>
              </View>
            </View>
            
            {team.members?.map((m: any) => (
              <View key={m.id} style={styles.memberRow}>
                <View>
                  <Text style={styles.memberName}>{m.student.user.name}</Text>
                  <Text style={styles.memberReg}>{m.student.registerNumber}</Text>
                </View>
                <Text style={styles.memberBatch}>{m.student.batch?.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress Updates</Text>
          {team.progress && team.progress.length === 0 ? (
            <Text style={styles.emptyTxt}>No progress logged yet.</Text>
          ) : (
            team.progress.map((p: any) => (
              <View key={p.id} style={styles.progressCard}>
                <Text style={[styles.progressDate, { color: colorTheme.main }]}>{new Date(p.date).toLocaleString()}</Text>
                <Text style={styles.progressDesc}>{p.description}</Text>
              </View>
            ))
          )}
        </View>

        {/* Add Progress Form (STUDENT only) */}
        {role === 'STUDENT' && (
          <View style={[styles.section, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 20 }]}>
            <Text style={styles.sectionTitle}>Log New Progress</Text>
            <TextInput 
              style={[styles.input, { height: 80 }]} 
              placeholder="What did you achieve today?" 
              value={progressDesc} 
              onChangeText={setProgressDesc} 
              multiline textAlignVertical="top" 
            />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colorTheme.main }]} onPress={handleAddProgress} disabled={isSubmittingProgress}>
              {isSubmittingProgress ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnTxt}>Add Progress</Text>}
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
  scrollContent: { padding: 20, paddingBottom: 60 },

  ideaSection: { padding: 20, borderRadius: 16, marginBottom: 24 },
  ideaTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  ideaDesc: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  
  membersCard: { backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  memberName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  leaderBadge: { fontSize: 12, fontWeight: '800' },
  memberReg: { fontSize: 13, color: COLORS.textSecondary },
  memberBatch: { fontSize: 12, color: COLORS.textSecondary, backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },

  emptyTxt: { textAlign: 'center', color: COLORS.textSecondary, marginVertical: 10, fontStyle: 'italic' },
  progressCard: { backgroundColor: COLORS.white, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  progressDate: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  progressDesc: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22 },

  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, marginBottom: 16 },
  submitBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitBtnTxt: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});

export default TeamDetailScreen;
