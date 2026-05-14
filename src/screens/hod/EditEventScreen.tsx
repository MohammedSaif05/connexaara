import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import BackIcon from '../../assets/svg/back.svg';
import { updateEvent, Event } from '../../services/api';
import Skeleton from '../../components/Skeleton';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  purple: '#7B61FF',
  purpleLight: '#F3F0FF',
  border: '#E5E7EB',
};

const EditEventScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const event: Event = route.params.event;

  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description);
  
  const [startDate, setStartDate] = useState(new Date(event.startDate));
  const [endDate, setEndDate] = useState(new Date(event.endDate));
  
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  const [thumbnail, setThumbnail] = useState<any>(null); // For new thumbnail
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(event.thumbnailUrl || null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  React.useEffect(() => {
    // Artificial delay to show skeleton transition and match app feel
    const timer = setTimeout(() => setIsInitializing(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (result.assets && result.assets.length > 0) {
        setThumbnail(result.assets[0]);
      }
    } catch (err) {
      console.log('Image picker error', err);
    }
  };

  const handleUpdate = async () => {
    if (!name || !description) return Alert.alert('Error', 'Name and description are required');

    setIsSubmitting(true);
    try {
      await updateEvent(event.id, {
        name,
        description,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        thumbnail,
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <BackIcon width={24} height={24} fill={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Event</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {isInitializing ? (
        <ScrollView contentContainerStyle={styles.formScroll}>
          <Skeleton width={80} height={16} style={{ marginTop: 16, marginBottom: 8 }} />
          <Skeleton width="100%" height={50} borderRadius={12} />
          
          <Skeleton width={80} height={16} style={{ marginTop: 16, marginBottom: 8 }} />
          <Skeleton width="100%" height={80} borderRadius={12} />
          
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Skeleton width={80} height={16} style={{ marginTop: 16, marginBottom: 8 }} />
              <Skeleton width="100%" height={50} borderRadius={12} />
            </View>
            <View style={{ flex: 1 }}>
              <Skeleton width={80} height={16} style={{ marginTop: 16, marginBottom: 8 }} />
              <Skeleton width="100%" height={50} borderRadius={12} />
            </View>
          </View>
          
          <Skeleton width={180} height={16} style={{ marginTop: 16, marginBottom: 8 }} />
          <Skeleton width="100%" height={160} borderRadius={12} />
          
          <Skeleton width="100%" height={56} borderRadius={16} style={{ marginTop: 32 }} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.formScroll}>
          <Text style={styles.inputLabel}>Event Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput style={[styles.input, { height: 80 }]} value={description} onChangeText={setDescription} multiline textAlignVertical="top" />

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
          <TouchableOpacity style={styles.imgPickerBtn} onPress={handlePickImage} activeOpacity={0.8}>
            {thumbnail ? (
              <Image source={{ uri: thumbnail.uri }} style={styles.previewImg} />
            ) : existingThumbnailUrl ? (
              <Image source={{ uri: existingThumbnailUrl }} style={styles.previewImg} />
            ) : (
              <Text style={styles.imgPickerTxt}>Tap to upload a new image</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitBtn} onPress={handleUpdate} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnTxt}>Update Event</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIconTxt}>🎉</Text>
            </View>
            <Text style={styles.successTitle}>Updated!</Text>
            <Text style={styles.successDesc}>The event has been updated successfully.</Text>
            <TouchableOpacity 
              style={styles.successBtn} 
              activeOpacity={0.8}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.navigate('HODDashboard');
              }}
            >
              <Text style={styles.successBtnTxt}>Back to Dashboard</Text>
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
  
  formScroll: { padding: 20, paddingBottom: 60 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, height: 50, justifyContent: 'center' },
  row: { flexDirection: 'row' },
  
  imgPickerBtn: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, height: 160, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderStyle: 'dashed' },
  imgPickerTxt: { color: COLORS.textSecondary, fontWeight: '600' },
  previewImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  submitBtn: { backgroundColor: COLORS.purple, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 32, shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnTxt: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(27, 42, 74, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', backgroundColor: COLORS.white, borderRadius: 28, padding: 32, alignItems: 'center' },
  successIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.purpleLight, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successIconTxt: { fontSize: 40 },
  successTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  successDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 32 },
  successBtn: { width: '100%', backgroundColor: COLORS.purple, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  successBtnTxt: { fontSize: 18, fontWeight: '700', color: COLORS.white },
});

export default EditEventScreen;
