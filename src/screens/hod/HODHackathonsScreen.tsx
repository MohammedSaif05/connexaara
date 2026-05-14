import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal, Image, Switch, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import BackIcon from '../../assets/svg/back.svg';
import { Hackathon, HackathonTeam, getHackathons, getHackathonTeams, createHackathon } from '../../services/api';
import Skeleton from '../../components/Skeleton';

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
  const [refreshing, setRefreshing] = useState(false);

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  const onRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
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
      role: 'HOD',
      colorTheme: { main: COLORS.orange, light: COLORS.orangeLight }
    });
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
      
      // Reset form
      setName(''); setDescription(''); setIsGroup(false); setThumbnail(null);
      
      // Show success modal instead of alert
      setShowSuccessModal(true);
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
            <BackIcon width={24} height={24} fill={COLORS.textPrimary} />
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
            <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
              {[1, 2].map((_, index) => (
                <View key={index} style={styles.card}>
                  <Skeleton width="100%" height={140} borderRadius={0} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardHeaderRow}>
                      <Skeleton width="60%" height={22} />
                      <Skeleton width={50} height={24} borderRadius={8} />
                    </View>
                    <Skeleton width="90%" height={14} style={{ marginBottom: 6 }} />
                    <Skeleton width="70%" height={14} style={{ marginBottom: 16 }} />
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Skeleton width={80} height={12} style={{ marginBottom: 4 }} />
                        <Skeleton width={40} height={18} />
                      </View>
                      <View style={styles.statItem}>
                        <Skeleton width={80} height={12} style={{ marginBottom: 4 }} />
                        <Skeleton width={60} height={18} />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView 
              contentContainerStyle={styles.scrollList}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.orange]} />}
            >
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
      <Modal visible={showSuccessModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIconTxt}>🎉</Text>
            </View>
            <Text style={styles.successTitle}>Awesome!</Text>
            <Text style={styles.successDesc}>Your hackathon has been created successfully. Students can now view and register for it.</Text>
            
            <TouchableOpacity 
              style={styles.successBtn} 
              activeOpacity={0.8}
              onPress={() => {
                setShowSuccessModal(false);
                setActiveTab('LIST');
              }}
            >
              <Text style={styles.successBtnTxt}>View Hackathons</Text>
            </TouchableOpacity>
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
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
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

  successModalOverlay: { flex: 1, backgroundColor: 'rgba(27, 42, 74, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successModalContent: { width: '100%', backgroundColor: COLORS.white, borderRadius: 28, padding: 32, alignItems: 'center', shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10 },
  successIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.orangeLight, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 4, borderColor: COLORS.white, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  successIconTxt: { fontSize: 40 },
  successTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 },
  successDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 10 },
  successBtn: { width: '100%', height: 56, backgroundColor: COLORS.orange, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  successBtnTxt: { fontSize: 18, fontWeight: '700', color: COLORS.white },
});

export default HODHackathonsScreen;
