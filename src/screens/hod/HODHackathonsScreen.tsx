import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal, Image, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Hackathon, HackathonTeam, getHackathons, getHackathonTeams, createHackathon } from '../../services/api';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  orange: '#FF9800',
  orangeLight: '#FFF0D4',
  danger: '#EF4444',
  border: '#E5E7EB',
};

const HODHackathonsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  
  // List State
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHackathon, setSelectedHackathon] = useState<Hackathon | null>(null);
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [minSize, setMinSize] = useState('2');
  const [maxSize, setMaxSize] = useState('4');
  const [thumbnail, setThumbnail] = useState<any>(null);
  
  const [regDate, setRegDate] = useState(new Date());
  const [hackDate, setHackDate] = useState(new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)); // +7 days
  const [showRegPicker, setShowRegPicker] = useState(false);
  const [showHackPicker, setShowHackPicker] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'LIST') fetchHackathons();
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

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });
    if (result.assets && result.assets.length > 0) {
      setThumbnail(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!name || !description) return Alert.alert('Error', 'Name and description are required');
    if (isGroup && (!minSize || !maxSize)) return Alert.alert('Error', 'Please specify min and max team size');

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('isGroup', String(isGroup));
      
      if (isGroup) {
        formData.append('minSize', minSize);
        formData.append('maxSize', maxSize);
      }
      
      formData.append('registrationDeadline', regDate.toISOString());
      formData.append('hackathonDate', hackDate.toISOString());

      if (thumbnail) {
        formData.append('thumbnail', {
          uri: thumbnail.uri,
          type: thumbnail.type || 'image/jpeg',
          name: thumbnail.fileName || 'thumbnail.jpg',
        } as any);
      }

      await createHackathon(formData);
      Alert.alert('Success', 'Hackathon created successfully!');
      
      // Reset form
      setName(''); setDescription(''); setIsGroup(false); setThumbnail(null);
      setActiveTab('LIST');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create hackathon');
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
            <Text style={styles.backTxt}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hackathons</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'LIST' && styles.activeTab]}
            onPress={() => setActiveTab('LIST')}
          >
            <Text style={[styles.tabText, activeTab === 'LIST' && styles.activeTabText]}>Active Events</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'CREATE' && styles.activeTab]}
            onPress={() => setActiveTab('CREATE')}
          >
            <Text style={[styles.tabText, activeTab === 'CREATE' && styles.activeTabText]}>Create New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'LIST' ? (
          loading ? (
            <ActivityIndicator size="large" color={COLORS.orange} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView contentContainerStyle={styles.scrollList}>
              {hackathons.length === 0 ? (
                <Text style={styles.emptyTxt}>No hackathons created yet.</Text>
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
          )
        ) : (
          <ScrollView contentContainerStyle={styles.formScroll}>
            <Text style={styles.inputLabel}>Event Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Spring Hack 2026" value={name} onChangeText={setName} />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput style={[styles.input, { height: 80 }]} placeholder="Event details..." value={description} onChangeText={setDescription} multiline textAlignVertical="top" />

            <View style={styles.switchRow}>
              <Text style={styles.inputLabel}>Group Hackathon?</Text>
              <Switch value={isGroup} onValueChange={setIsGroup} trackColor={{ true: COLORS.orangeLight }} thumbColor={isGroup ? COLORS.orange : COLORS.textSecondary} />
            </View>

            {isGroup && (
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.inputLabel}>Min Size</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={minSize} onChangeText={setMinSize} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Max Size</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={maxSize} onChangeText={setMaxSize} />
                </View>
              </View>
            )}

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputLabel}>Registration Deadline</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowRegPicker(true)}>
                  <Text>{regDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showRegPicker && (
                  <DateTimePicker value={regDate} mode="date" display="default" onChange={(e, d) => { setShowRegPicker(false); if (d) setRegDate(d); }} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Event Date</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowHackPicker(true)}>
                  <Text>{hackDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showHackPicker && (
                  <DateTimePicker value={hackDate} mode="date" display="default" onChange={(e, d) => { setShowHackPicker(false); if (d) setHackDate(d); }} />
                )}
              </View>
            </View>

            <Text style={styles.inputLabel}>Thumbnail Image (Optional)</Text>
            <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
              {thumbnail ? (
                <Image source={{ uri: thumbnail.uri }} style={styles.pickedImage} />
              ) : (
                <Text style={styles.imagePickerTxt}>Tap to select image</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnTxt}>Create Hackathon</Text>}
            </TouchableOpacity>
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
              <ActivityIndicator size="large" color={COLORS.orange} style={{ margin: 40 }} />
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
  header: { backgroundColor: COLORS.white, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 20 },
  backTxt: { fontSize: 20, color: COLORS.textPrimary },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  tabContainer: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  activeTabText: { color: COLORS.orange },
  content: { flex: 1 },
  scrollList: { padding: 20 },
  formScroll: { padding: 20, paddingBottom: 100 },
  emptyTxt: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardImage: { width: '100%', height: 140, backgroundColor: COLORS.border },
  cardBody: { padding: 16 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  badge: { backgroundColor: COLORS.orangeLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTxt: { color: COLORS.orange, fontSize: 12, fontWeight: '700' },
  cardDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  statItem: { flex: 1 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16, justifyContent: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  row: { flexDirection: 'row' },
  imagePickerBtn: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: 12, height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 24, overflow: 'hidden' },
  imagePickerTxt: { color: COLORS.textSecondary, fontWeight: '500' },
  pickedImage: { width: '100%', height: '100%' },
  submitBtn: { backgroundColor: COLORS.orange, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitBtnTxt: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  closeTxt: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  teamCard: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16, marginBottom: 12 },
  teamName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  ideaTitle: { fontSize: 14, fontWeight: '600', color: COLORS.orange, marginBottom: 4 },
  ideaDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  teamStats: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  teamStatTxt: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
});

export default HODHackathonsScreen;
