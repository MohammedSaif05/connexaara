import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackIcon from '../../assets/svg/back.svg';
import { getDepartmentStudents, registerHackathonTeam } from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  border: '#E5E7EB',
  green: '#10B981',
};

const StudentHackathonRegistrationScreen = ({ route }: any) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const { hackathon, colorTheme } = route.params;

  const [teamName, setTeamName] = useState('');
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDesc, setIdeaDesc] = useState('');
  
  const [batches, setBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (hackathon.isGroup) {
      fetchDepartmentStudents();
    }
  }, []);

  const fetchDepartmentStudents = async () => {
    try {
      setLoadingBatches(true);
      const data = await getDepartmentStudents();
      setBatches(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load department students');
    } finally {
      setLoadingBatches(false);
    }
  };

  const toggleMember = (studentId: string) => {
    if (selectedMembers.includes(studentId)) {
      setSelectedMembers(prev => prev.filter(id => id !== studentId));
    } else {
      // +1 because the current user is automatically the leader and takes 1 spot
      if (selectedMembers.length + 1 >= hackathon.maxSize) {
        Alert.alert('Limit Reached', `A team can only have a maximum of ${hackathon.maxSize} members including yourself.`);
        return;
      }
      setSelectedMembers(prev => [...prev, studentId]);
    }
  };

  const handleRegister = async () => {
    if (!ideaTitle || !ideaDesc) return Alert.alert('Error', 'Idea title and description are required');
    
    if (hackathon.isGroup) {
      if (!teamName) return Alert.alert('Error', 'Team name is required');
      const totalMembers = selectedMembers.length + 1; // +1 for the current user
      if (totalMembers < hackathon.minSize) {
        return Alert.alert('Not Enough Members', `You must select at least ${hackathon.minSize - 1} more member(s) to meet the minimum team size of ${hackathon.minSize}.`);
      }
    }

    setIsSubmitting(true);
    try {
      await registerHackathonTeam(hackathon.id, {
        teamName: hackathon.isGroup ? teamName : undefined,
        ideaTitle,
        ideaDescription: ideaDesc,
        memberIds: hackathon.isGroup ? selectedMembers : undefined,
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
          <Text style={styles.headerTitle}>Register for Hackathon</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Text style={styles.hackathonName}>{hackathon.name}</Text>
          <View style={[styles.badge, { backgroundColor: colorTheme.light }]}>
            <Text style={[styles.badgeTxt, { color: colorTheme.main }]}>
              {hackathon.isGroup ? `Group (${hackathon.minSize}-${hackathon.maxSize} members)` : 'Solo Participation'}
            </Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          
          {hackathon.isGroup && (
            <>
              <Text style={styles.inputLabel}>Team Name</Text>
              <TextInput style={styles.input} placeholder="e.g. Byte Benders" value={teamName} onChangeText={setTeamName} />
            </>
          )}
          
          <Text style={styles.inputLabel}>Idea Title</Text>
          <TextInput style={styles.input} placeholder="e.g. AI Attendance Tracker" value={ideaTitle} onChangeText={setIdeaTitle} />

          <Text style={styles.inputLabel}>Idea Description</Text>
          <TextInput style={[styles.input, { height: 100 }]} placeholder="Describe your solution..." value={ideaDesc} onChangeText={setIdeaDesc} multiline textAlignVertical="top" />
        </View>

        {hackathon.isGroup && (
          <View style={styles.membersSection}>
            <View style={styles.memberHeaderRow}>
              <Text style={styles.sectionTitle}>Select Team Members</Text>
              <Text style={styles.memberCountTxt}>{selectedMembers.length + 1} / {hackathon.maxSize} selected</Text>
            </View>
            <Text style={styles.helpText}>Select {hackathon.minSize - 1} to {hackathon.maxSize - 1} additional members from your department. You are automatically included as the leader.</Text>

            {loadingBatches ? (
              <ActivityIndicator size="large" color={colorTheme.main} style={{ marginTop: 20 }} />
            ) : batches.length === 0 ? (
              <Text style={styles.emptyTxt}>No batches found in your department.</Text>
            ) : (
              batches.map(batch => (
                <View key={batch.id} style={styles.batchContainer}>
                  <TouchableOpacity 
                    style={styles.batchHeader} 
                    activeOpacity={0.7} 
                    onPress={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
                  >
                    <View>
                      <Text style={styles.batchName}>{batch.name}</Text>
                      <Text style={styles.batchSem}>Semester {batch.currentSemester}</Text>
                    </View>
                    <Text style={styles.expandIcon}>{expandedBatch === batch.id ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {expandedBatch === batch.id && (
                    <View style={styles.studentsList}>
                      {batch.students.length === 0 ? (
                        <Text style={styles.emptyTxt}>No active students in this batch.</Text>
                      ) : (
                        batch.students.map((student: any) => {
                          const isSelected = selectedMembers.includes(student.id);
                          return (
                            <TouchableOpacity 
                              key={student.id} 
                              style={[styles.studentRow, isSelected && { backgroundColor: colorTheme.light, borderColor: colorTheme.main }]} 
                              activeOpacity={0.7}
                              onPress={() => toggleMember(student.id)}
                            >
                              <View>
                                <Text style={[styles.studentName, isSelected && { color: colorTheme.main }]}>{student.user.name}</Text>
                                <Text style={styles.studentReg}>{student.registerNumber}</Text>
                              </View>
                              <View style={[styles.checkbox, isSelected && { backgroundColor: colorTheme.main, borderColor: colorTheme.main }]}>
                                {isSelected && <Text style={styles.checkTxt}>✓</Text>}
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colorTheme.main }]} onPress={handleRegister} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnTxt}>Submit Registration</Text>}
        </TouchableOpacity>
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
                navigation.navigate('StudentDashboard'); 
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  scrollContent: { padding: 20, paddingBottom: 60 },
  
  infoCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  hackathonName: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeTxt: { fontSize: 12, fontWeight: '700' },

  formSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16, justifyContent: 'center' },

  membersSection: { marginBottom: 24 },
  memberHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  memberCountTxt: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  helpText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 20 },
  
  batchContainer: { backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  batchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: COLORS.white },
  batchName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  batchSem: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  expandIcon: { fontSize: 16, color: COLORS.textSecondary },
  
  studentsList: { borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.white },
  studentName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  studentReg: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.textSecondary, justifyContent: 'center', alignItems: 'center' },
  checkTxt: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  
  emptyTxt: { textAlign: 'center', color: COLORS.textSecondary, padding: 16, fontStyle: 'italic' },

  submitBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  submitBtnTxt: { color: COLORS.white, fontSize: 18, fontWeight: '700' },

  successModalOverlay: { flex: 1, backgroundColor: 'rgba(27, 42, 74, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successModalContent: { width: '100%', backgroundColor: COLORS.white, borderRadius: 28, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10 },
  successIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 4, borderColor: COLORS.white, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  successIconTxt: { fontSize: 40 },
  successTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 },
  successDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 10 },
  successBtn: { width: '100%', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  successBtnTxt: { fontSize: 18, fontWeight: '700', color: COLORS.white },
});

export default StudentHackathonRegistrationScreen;
