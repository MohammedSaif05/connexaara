import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/ToastContext';
import ViewIcon from '../../assets/svg/view.svg';

const COLORS = {
  background: '#F5F7FA',
  white: '#FFFFFF',
  textPrimary: '#1B2A4A',
  textSecondary: '#7A869A',
  primary: '#2EC4B6',
  purple: '#6C5CE7',
  purpleLight: '#F0EFFF',
  border: '#E2E8F0',
  inputBg: '#F8FAFC',
};

interface Staff {
  id: string;
  name: string;
}

interface Batch {
  id: string;
  name: string;
  startYear: string;
  endYear: string;
  tutorId: string;
  tutorName: string;
}

const MOCK_STAFF: Staff[] = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Jane Smith' },
  { id: '3', name: 'Michael Johnson' },
  { id: '4', name: 'Sarah Williams' },
];

const INITIAL_BATCHES: Batch[] = [
  { id: '1', name: 'BTech CS', startYear: '2024', endYear: '2028', tutorId: '1', tutorName: 'John Doe' },
  { id: '2', name: 'BTech IT', startYear: '2023', endYear: '2027', tutorId: '2', tutorName: 'Jane Smith' },
];

const HODBatchesScreen = () => {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [batchesList, setBatchesList] = useState<Batch[]>(INITIAL_BATCHES);
  const [modalVisible, setModalVisible] = useState(false);

  // New Batch Form State
  const [newName, setNewName] = useState('');
  const [newStartYear, setNewStartYear] = useState('');
  const [newEndYear, setNewEndYear] = useState('');
  const [selectedTutorId, setSelectedTutorId] = useState<string>('');

  // Manual Keyboard Tracking for Android Modal Bug
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'ios') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardPadding(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardPadding(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleAddBatch = () => {
    if (!newName.trim() || !newStartYear.trim() || !newEndYear.trim() || !selectedTutorId) return;

    const tutor = MOCK_STAFF.find(s => s.id === selectedTutorId);

    const newBatch: Batch = {
      id: Math.random().toString(),
      name: newName,
      startYear: newStartYear,
      endYear: newEndYear,
      tutorId: selectedTutorId,
      tutorName: tutor?.name || 'Unknown',
    };

    setBatchesList([newBatch, ...batchesList]);

    // Reset and close
    setNewName('');
    setNewStartYear('');
    setNewEndYear('');
    setSelectedTutorId('');
    setModalVisible(false);

    showToast('Batch created successfully!', 'success');
  };

  const renderBatchItem = ({ item }: { item: Batch }) => (
    <View style={styles.cardContainer}>
      <View style={styles.cardInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.batchName}>{item.name}</Text>
          <Text style={styles.batchSub}>{item.startYear} - {item.endYear}  •  Tutor: {item.tutorName}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.viewButton} activeOpacity={0.7}>
        <ViewIcon width={20} height={20} color={COLORS.purple} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        <Text style={styles.headerTitle}>Academic Batches</Text>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add Batch</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={batchesList}
        keyExtractor={item => item.id}
        renderItem={renderBatchItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No batches found.</Text>
          </View>
        }
      />

      {/* Add Batch Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setModalVisible(false); }}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) + keyboardPadding }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New Batch</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeModalText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Batch Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. BTech Computer Science"
                    placeholderTextColor={COLORS.textSecondary}
                    value={newName}
                    onChangeText={setNewName}
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.inputLabel}>Start Year</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. 2024"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="numeric"
                      maxLength={4}
                      value={newStartYear}
                      onChangeText={setNewStartYear}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                    <Text style={styles.inputLabel}>End Year</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. 2028"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="numeric"
                      maxLength={4}
                      value={newEndYear}
                      onChangeText={setNewEndYear}
                    />
                  </View>
                </View>

                {/* Custom Tutor Dropdown / Chip Selector */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Assign Class Tutor</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tutorList}
                  >
                    {MOCK_STAFF.map((staff) => {
                      const isSelected = selectedTutorId === staff.id;
                      return (
                        <TouchableOpacity
                          key={staff.id}
                          activeOpacity={0.7}
                          onPress={() => setSelectedTutorId(staff.id)}
                          style={[
                            styles.tutorChip,
                            isSelected && styles.tutorChipSelected
                          ]}
                        >
                          <Text style={[
                            styles.tutorChipText,
                            isSelected && styles.tutorChipTextSelected
                          ]}>
                            {staff.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      (!newName.trim() || !newStartYear.trim() || !newEndYear.trim() || !selectedTutorId) && styles.saveBtnDisabled
                    ]}
                    onPress={handleAddBatch}
                    disabled={!newName.trim() || !newStartYear.trim() || !newEndYear.trim() || !selectedTutorId}
                  >
                    <Text style={styles.saveBtnText}>Save Batch</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  addButton: {
    backgroundColor: '#1B2A4A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 10,
  },
  cardContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.purple,
  },
  details: {
    flex: 1,
  },
  batchName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  batchSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closeModalText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textSecondary,
    padding: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  tutorList: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  tutorChip: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  tutorChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tutorChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tutorChipTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.inputBg,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.textPrimary,
    marginLeft: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#A0AABF',
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default HODBatchesScreen;
