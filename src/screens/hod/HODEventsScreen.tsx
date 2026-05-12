import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import BackIcon from '../../assets/svg/back.svg';
import { Event, getEvents, createEvent } from '../../services/api';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  purple: '#7B61FF',
  purpleLight: '#F3F0FF',
  danger: '#EF4444',
  border: '#E5E7EB',
};

const HODEventsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  
  // List State
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState<any>(null);
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'LIST') fetchEvents();
  }, [activeTab]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getEvents();
      setEvents(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to refresh events');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectEvent = (event: Event) => {
    navigation.navigate('EventDetail', {
      event,
      role: 'HOD',
      colorTheme: { main: COLORS.purple, light: COLORS.purpleLight }
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

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('startDate', startDate.toISOString());
      formData.append('endDate', endDate.toISOString());

      if (thumbnail) {
        formData.append('thumbnail', {
          uri: thumbnail.uri,
          type: thumbnail.type || 'image/jpeg',
          name: thumbnail.fileName || 'thumbnail.jpg',
        } as any);
      }

      await createEvent(formData);
      
      // Reset form
      setName(''); setDescription(''); setThumbnail(null);
      
      // Show success modal
      setShowSuccessModal(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create event');
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
          <Text style={styles.headerTitle}>Events</Text>
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
            <ActivityIndicator size="large" color={COLORS.purple} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView 
              contentContainerStyle={styles.scrollList}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.purple]} />}
            >
              {events.length === 0 ? (
                <Text style={styles.emptyTxt}>No events created yet.</Text>
              ) : (
                events.map(e => (
                  <TouchableOpacity key={e.id} style={styles.card} activeOpacity={0.8} onPress={() => handleSelectEvent(e)}>
                    {e.thumbnailUrl && (
                      <Image source={{ uri: e.thumbnailUrl }} style={styles.cardImage} />
                    )}
                    <View style={styles.cardBody}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>{e.name}</Text>
                        <View style={styles.badge}>
                          <Text style={styles.badgeTxt}>{e.department?.name || 'College'}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardDesc} numberOfLines={2}>{e.description}</Text>
                      
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Start Date</Text>
                          <Text style={styles.statValue}>{new Date(e.startDate).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>End Date</Text>
                          <Text style={styles.statValue}>{new Date(e.endDate).toLocaleDateString()}</Text>
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
            <TextInput style={styles.input} placeholder="e.g. Annual Sports Meet" value={name} onChangeText={setName} />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput style={[styles.input, { height: 80 }]} placeholder="Event details..." value={description} onChangeText={setDescription} multiline textAlignVertical="top" />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputLabel}>Start Date</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowStartPicker(true)}>
                  <Text>{startDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker value={startDate} mode="date" display="default" onChange={(e, d) => { setShowStartPicker(false); if (d) setStartDate(d); }} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>End Date</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowEndPicker(true)}>
                  <Text>{endDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker value={endDate} mode="date" display="default" onChange={(e, d) => { setShowEndPicker(false); if (d) setEndDate(d); }} />
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
              {isSubmitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnTxt}>Create Event</Text>}
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
            <Text style={styles.successDesc}>Your event has been created successfully. The whole college can now view it.</Text>
            
            <TouchableOpacity 
              style={styles.successBtn} 
              activeOpacity={0.8}
              onPress={() => {
                setShowSuccessModal(false);
                setActiveTab('LIST');
              }}
            >
              <Text style={styles.successBtnTxt}>View Events</Text>
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
  activeTabText: { color: COLORS.purple },
  content: { flex: 1 },
  scrollList: { padding: 20 },
  formScroll: { padding: 20, paddingBottom: 100 },
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
  
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16, justifyContent: 'center' },
  row: { flexDirection: 'row' },
  imagePickerBtn: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: 12, height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 24, overflow: 'hidden' },
  imagePickerTxt: { color: COLORS.textSecondary, fontWeight: '500' },
  pickedImage: { width: '100%', height: '100%' },
  submitBtn: { backgroundColor: COLORS.purple, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitBtnTxt: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  successModalOverlay: { flex: 1, backgroundColor: 'rgba(27, 42, 74, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successModalContent: { width: '100%', backgroundColor: COLORS.white, borderRadius: 28, padding: 32, alignItems: 'center', shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10 },
  successIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.purpleLight, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 4, borderColor: COLORS.white, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  successIconTxt: { fontSize: 40 },
  successTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 },
  successDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 10 },
  successBtn: { width: '100%', height: 56, backgroundColor: COLORS.purple, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  successBtnTxt: { fontSize: 18, fontWeight: '700', color: COLORS.white },
});

export default HODEventsScreen;
