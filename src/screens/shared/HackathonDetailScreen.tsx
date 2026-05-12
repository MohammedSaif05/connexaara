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

  // STUDENT Registration State
  const [teamName, setTeamName] = useState('');
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDesc, setIdeaDesc] = useState('');
  const [memberIdsInput, setMemberIdsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  const handleRegister = async () => {
    if (!ideaTitle || !ideaDesc) return Alert.alert('Error', 'Idea title and description are required');
    if (hackathon.isGroup && !teamName) return Alert.alert('Error', 'Team name is required');

    let memberIds: string[] = [];
    if (hackathon.isGroup && memberIdsInput.trim()) {
      memberIds = memberIdsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }

    setIsSubmitting(true);
    try {
      await registerHackathonTeam(hackathon.id, {
        teamName: hackathon.isGroup ? teamName : undefined,
        ideaTitle,
        ideaDescription: ideaDesc,
        memberIds: hackathon.isGroup ? memberIds : undefined,
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
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

        {/* STUDENT Registration Form */}
        {role === 'STUDENT' && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Register Your Idea</Text>
            
            {hackathon.isGroup && (
              <>
                <Text style={styles.inputLabel}>Team Name</Text>
                <TextInput style={styles.input} placeholder="e.g. Byte Benders" value={teamName} onChangeText={setTeamName} />
              </>
            )}
            
            <Text style={styles.inputLabel}>Idea Title</Text>
            <TextInput style={styles.input} placeholder="e.g. AI Attendance Tracker" value={ideaTitle} onChangeText={setIdeaTitle} />

            <Text style={styles.inputLabel}>Idea Description</Text>
            <TextInput style={[styles.input, { height: 80 }]} placeholder="Describe your solution..." value={ideaDesc} onChangeText={setIdeaDesc} multiline textAlignVertical="top" />

            {hackathon.isGroup && (
              <>
                <Text style={styles.inputLabel}>Member UUIDs (comma separated)</Text>
                <TextInput style={styles.input} placeholder="e.g. 1234-abcd, 5678-efgh" value={memberIdsInput} onChangeText={setMemberIdsInput} />
                <Text style={styles.helpText}>Team must have {hackathon.minSize} to {hackathon.maxSize} members total.</Text>
              </>
            )}

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colorTheme.main }]} onPress={handleRegister} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnTxt}>Submit Registration</Text>}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Custom Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={[styles.successIconContainer, { backgroundColor: colorTheme.light }]}>
              <Text style={styles.successIconTxt}>🎉</Text>
            </View>
            <Text style={styles.successTitle}>Awesome!</Text>
            <Text style={styles.successDesc}>You have successfully registered for {hackathon.name}. Good luck!</Text>
            
            <TouchableOpacity 
              style={[styles.successBtn, { backgroundColor: colorTheme.main }]} 
              activeOpacity={0.8}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.successBtnTxt}>Back to Hackathons</Text>
            </TouchableOpacity>
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
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16, justifyContent: 'center' },
  helpText: { fontSize: 12, color: COLORS.textSecondary, marginTop: -10, marginBottom: 16 },
  submitBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  submitBtnTxt: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  successModalOverlay: { flex: 1, backgroundColor: 'rgba(27, 42, 74, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successModalContent: { width: '100%', backgroundColor: COLORS.white, borderRadius: 28, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10 },
  successIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 4, borderColor: COLORS.white, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  successIconTxt: { fontSize: 40 },
  successTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 },
  successDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 10 },
  successBtn: { width: '100%', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  successBtnTxt: { fontSize: 18, fontWeight: '700', color: COLORS.white },
});

export default HackathonDetailScreen;
