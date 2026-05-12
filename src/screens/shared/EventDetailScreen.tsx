import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackIcon from '../../assets/svg/back.svg';
import EditIcon from '../../assets/svg/edit.svg';
import DeleteIcon from '../../assets/svg/delete.svg';
import { deleteEvent } from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  border: '#E5E7EB',
};

const EventDetailScreen = ({ route }: any) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const { event, role, colorTheme } = route.params;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteEvent(event.id);
      setShowDeleteModal(false);
      navigation.navigate('HODDashboard');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete event');
    } finally {
      setIsDeleting(false);
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
          <Text style={styles.headerTitle} numberOfLines={1}>{event.name}</Text>
          
          {role === 'HOD' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => navigation.navigate('EditEvent', { event })} style={{ padding: 8 }}>
                <EditIcon width={20} height={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={{ padding: 8, marginLeft: 4 }}>
                <DeleteIcon width={20} height={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Event Info */}
        {event.thumbnailUrl && (
          <Image source={{ uri: event.thumbnailUrl }} style={styles.heroImage} />
        )}
        
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{event.name}</Text>
            <View style={[styles.badge, { backgroundColor: colorTheme.light }]}>
              <Text style={[styles.badgeTxt, { color: colorTheme.main }]}>
                {event.department?.name || 'College'}
              </Text>
            </View>
          </View>
          <Text style={styles.description}>{event.description}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Start Date</Text>
              <Text style={styles.statValue}>{new Date(event.startDate).toLocaleDateString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>End Date</Text>
              <Text style={styles.statValue}>{new Date(event.endDate).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.warningIconContainer}>
              <DeleteIcon width={36} height={36} color={COLORS.danger} />
            </View>
            <Text style={styles.modalTitle}>Delete Event?</Text>
            <Text style={styles.modalDesc}>
              Are you sure you want to completely delete <Text style={{fontWeight: '700'}}>{event.name}</Text>? 
              This action cannot be undone.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDeleteModal(false)} disabled={isDeleting}>
                <Text style={styles.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={confirmDelete} disabled={isDeleting}>
                {isDeleting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.confirmDeleteTxt}>Yes, Delete</Text>}
              </TouchableOpacity>
            </View>
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

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(27, 42, 74, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', backgroundColor: COLORS.white, borderRadius: 28, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10 },
  warningIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.dangerLight, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
  modalDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 10 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  cancelBtnTxt: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  confirmDeleteBtn: { flex: 1, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.danger, shadowColor: COLORS.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  confirmDeleteTxt: { fontSize: 16, fontWeight: '700', color: COLORS.white },
});

export default EventDetailScreen;
