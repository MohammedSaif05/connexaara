import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import BackIcon from '../../assets/svg/back.svg';
import { updateHackathon, Hackathon } from '../../services/api';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  orange: '#FF9800',
  orangeLight: '#FFF0D4',
  border: '#E5E7EB',
};

const EditHackathonScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const hackathon: Hackathon = route.params.hackathon;

  const [name, setName] = useState(hackathon.name);
  const [description, setDescription] = useState(hackathon.description);
  
  const [regDate, setRegDate] = useState(new Date(hackathon.registrationDeadline));
  const [hackDate, setHackDate] = useState(new Date(hackathon.hackathonDate));
  
  const [showRegPicker, setShowRegPicker] = useState(false);
  const [showHackPicker, setShowHackPicker] = useState(false);
  
  const [thumbnail, setThumbnail] = useState<any>(null); // For new thumbnail
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(hackathon.thumbnailUrl || null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
      await updateHackathon(hackathon.id, {
        name,
        description,
        registrationDeadline: regDate.toISOString(),
        hackathonDate: hackDate.toISOString(),
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
          <Text style={styles.headerTitle}>Edit Hackathon</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.formScroll}>
        <Text style={styles.inputLabel}>Event Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Text style={styles.inputLabel}>Description</Text>
        <TextInput style={[styles.input, { height: 80 }]} value={description} onChangeText={setDescription} multiline textAlignVertical="top" />

        {/* Note: isGroup, minSize, and maxSize cannot be edited */}

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
          {isSubmitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnTxt}>Update Hackathon</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIconTxt}>🎉</Text>
            </View>
            <Text style={styles.successTitle}>Updated!</Text>
            <Text style={styles.successDesc}>The hackathon has been updated successfully.</Text>
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
  
  submitBtn: { backgroundColor: COLORS.orange, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 32, shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnTxt: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(27, 42, 74, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', backgroundColor: COLORS.white, borderRadius: 28, padding: 32, alignItems: 'center' },
  successIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.orangeLight, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successIconTxt: { fontSize: 40 },
  successTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  successDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 32 },
  successBtn: { width: '100%', backgroundColor: COLORS.orange, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  successBtnTxt: { fontSize: 18, fontWeight: '700', color: COLORS.white },
});

export default EditHackathonScreen;
