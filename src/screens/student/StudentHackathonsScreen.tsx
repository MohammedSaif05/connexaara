import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Image, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hackathon, getHackathons, registerHackathonTeam, getMyTeams, getTeamDetails, addHackathonProgress, HackathonTeam } from '../../services/api';

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
  const [selectedHackathon, setSelectedHackathon] = useState<Hackathon | null>(null);

  // My Teams State
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [loadingMyTeams, setLoadingMyTeams] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<HackathonTeam | null>(null);

  // Registration Form
  const [teamName, setTeamName] = useState('');
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDesc, setIdeaDesc] = useState('');
  const [memberIdsInput, setMemberIdsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Progress Form
  const [progressDesc, setProgressDesc] = useState('');
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);

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

  const handleRegister = async () => {
    if (!selectedHackathon) return;
    if (!ideaTitle || !ideaDesc) return Alert.alert('Error', 'Idea title and description are required');
    if (selectedHackathon.isGroup && !teamName) return Alert.alert('Error', 'Team name is required');

    let memberIds: string[] = [];
    if (selectedHackathon.isGroup && memberIdsInput.trim()) {
      memberIds = memberIdsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }

    setIsSubmitting(true);
    try {
      await registerHackathonTeam(selectedHackathon.id, {
        teamName: selectedHackathon.isGroup ? teamName : undefined,
        ideaTitle,
        ideaDescription: ideaDesc,
        memberIds: selectedHackathon.isGroup ? memberIds : undefined,
      });
      Alert.alert('Success', 'Successfully registered for hackathon!');
      setSelectedHackathon(null);
      setTeamName(''); setIdeaTitle(''); setIdeaDesc(''); setMemberIdsInput('');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectTeam = async (teamId: string) => {
    try {
      const data = await getTeamDetails(teamId);
      setSelectedTeam(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load team details');
    }
  };

  const handleAddProgress = async () => {
    if (!selectedTeam || !progressDesc.trim()) return;
    setIsSubmittingProgress(true);
    try {
      await addHackathonProgress(selectedTeam.id, {
        description: progressDesc,
        date: new Date().toISOString(),
      });
      setProgressDesc('');
      // Refresh team details
      handleSelectTeam(selectedTeam.id);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add progress');
    } finally {
      setIsSubmittingProgress(false);
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
            <ActivityIndicator size="large" color={COLORS.blue} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView contentContainerStyle={styles.scrollList}>
              {hackathons.length === 0 ? (
                <Text style={styles.emptyTxt}>No active hackathons found.</Text>
              ) : (
                hackathons.map(h => (
                  <TouchableOpacity key={h.id} style={styles.card} activeOpacity={0.8} onPress={() => setSelectedHackathon(h)}>
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
            <ActivityIndicator size="large" color={COLORS.blue} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView contentContainerStyle={styles.scrollList}>
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

      {/* Registration Modal */}
      <Modal visible={!!selectedHackathon} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register for Hackathon</Text>
              <TouchableOpacity onPress={() => setSelectedHackathon(null)} style={styles.closeBtn}>
                <Text style={styles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {selectedHackathon?.isGroup && (
                <>
                  <Text style={styles.inputLabel}>Team Name</Text>
                  <TextInput style={styles.input} placeholder="e.g. Byte Benders" value={teamName} onChangeText={setTeamName} />
                </>
              )}
              
              <Text style={styles.inputLabel}>Idea Title</Text>
              <TextInput style={styles.input} placeholder="e.g. AI Attendance Tracker" value={ideaTitle} onChangeText={setIdeaTitle} />

              <Text style={styles.inputLabel}>Idea Description</Text>
              <TextInput style={[styles.input, { height: 80 }]} placeholder="Describe your solution..." value={ideaDesc} onChangeText={setIdeaDesc} multiline textAlignVertical="top" />

              {selectedHackathon?.isGroup && (
                <>
                  <Text style={styles.inputLabel}>Member UUIDs (comma separated, optional)</Text>
                  <TextInput style={styles.input} placeholder="e.g. 1234-abcd, 5678-efgh" value={memberIdsInput} onChangeText={setMemberIdsInput} />
                  <Text style={styles.helpText}>Team must have {selectedHackathon.minSize} to {selectedHackathon.maxSize} members total.</Text>
                </>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnTxt}>Submit Registration</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Team Details / Progress Modal */}
      <Modal visible={!!selectedTeam} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20), height: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedTeam?.teamName || 'My Team'}</Text>
              <TouchableOpacity onPress={() => setSelectedTeam(null)} style={styles.closeBtn}>
                <Text style={styles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              <View style={styles.teamDetailsSection}>
                <Text style={styles.sectionTitle}>Idea: {selectedTeam?.ideaTitle}</Text>
                <Text style={styles.ideaDesc}>{selectedTeam?.ideaDescription}</Text>
              </View>

              <Text style={styles.sectionTitle}>Members</Text>
              {selectedTeam?.members?.map(m => (
                <View key={m.id} style={styles.memberRow}>
                  <Text style={styles.memberName}>{m.student.user.name}</Text>
                  <Text style={styles.memberReg}>{m.student.registerNumber}</Text>
                </View>
              ))}

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Progress Updates</Text>
              {selectedTeam?.progress && selectedTeam.progress.length === 0 ? (
                <Text style={styles.emptyTxt}>No progress logged yet.</Text>
              ) : (
                selectedTeam?.progress?.map(p => (
                  <View key={p.id} style={styles.progressCard}>
                    <Text style={styles.progressDate}>{new Date(p.date).toLocaleString()}</Text>
                    <Text style={styles.progressDesc}>{p.description}</Text>
                  </View>
                ))
              )}

              <View style={styles.addProgressSection}>
                <Text style={styles.inputLabel}>Log New Progress</Text>
                <TextInput 
                  style={[styles.input, { height: 80 }]} 
                  placeholder="What did you achieve today?" 
                  value={progressDesc} 
                  onChangeText={setProgressDesc} 
                  multiline textAlignVertical="top" 
                />
                <TouchableOpacity style={styles.submitBtn} onPress={handleAddProgress} disabled={isSubmittingProgress}>
                  {isSubmittingProgress ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnTxt}>Add Progress</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.white, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 20 },
  backTxt: { fontSize: 20, color: COLORS.textPrimary },
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
  
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16, justifyContent: 'center' },
  helpText: { fontSize: 12, color: COLORS.textSecondary, marginTop: -10, marginBottom: 16 },
  submitBtn: { backgroundColor: COLORS.blue, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitBtnTxt: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  closeTxt: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  
  teamDetailsSection: { backgroundColor: COLORS.blueLight, padding: 16, borderRadius: 12, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  ideaDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  memberName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  memberReg: { fontSize: 14, color: COLORS.textSecondary },
  progressCard: { backgroundColor: COLORS.background, padding: 12, borderRadius: 8, marginBottom: 10 },
  progressDate: { fontSize: 12, color: COLORS.blue, fontWeight: '600', marginBottom: 4 },
  progressDesc: { fontSize: 14, color: COLORS.textPrimary },
  addProgressSection: { marginTop: 24, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 20 },
});

export default StudentHackathonsScreen;
