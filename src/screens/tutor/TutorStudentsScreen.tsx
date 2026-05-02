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
  ScrollView,
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

interface Student {
  id: string;
  name: string;
  regNo: string;
  email: string;
  dob: string;
}

const INITIAL_STUDENTS: Student[] = [
  { id: '1', name: 'Alice Walker', regNo: 'CS2024001', email: 'alice.w@university.edu', dob: '2005-04-12' },
  { id: '2', name: 'Bob Smith', regNo: 'CS2024002', email: 'bob.s@university.edu', dob: '2004-11-23' },
  { id: '3', name: 'Charlie Davis', regNo: 'CS2024003', email: 'charlie.d@university.edu', dob: '2005-08-05' },
];

const TutorStudentsScreen = () => {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [studentList, setStudentList] = useState<Student[]>(INITIAL_STUDENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // New Student Form State
  const [newName, setNewName] = useState('');
  const [newRegNo, setNewRegNo] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDob, setNewDob] = useState('');

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

  const filteredStudents = studentList.filter(
    student =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.regNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddStudent = () => {
    if (!newName.trim() || !newRegNo.trim() || !newEmail.trim() || !newDob.trim()) return;

    const newStudent: Student = {
      id: Math.random().toString(),
      name: newName,
      regNo: newRegNo,
      email: newEmail,
      dob: newDob,
    };

    setStudentList([newStudent, ...studentList]);

    // Reset and close
    setNewName('');
    setNewRegNo('');
    setNewEmail('');
    setNewDob('');
    setModalVisible(false);

    showToast('Student added successfully!', 'success');
  };

  const renderStudentItem = ({ item }: { item: Student }) => (
    <View style={styles.cardContainer}>
      <View style={styles.cardInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentSub}>{item.regNo}</Text>
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
        <Text style={styles.headerTitle}>Students</Text>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add Student</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search students by name or register no..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* List */}
      <FlatList
        data={filteredStudents}
        keyExtractor={item => item.id}
        renderItem={renderStudentItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No students found.</Text>
          </View>
        }
      />

      {/* Add Student Modal */}
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
                  <Text style={styles.modalTitle}>Add New Student</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeModalText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Using a ScrollView here ensures tall forms don't overflow un-scrollably on small screens */}
                <ScrollView 
                  style={styles.formScroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Student Name</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. John Doe"
                      placeholderTextColor={COLORS.textSecondary}
                      value={newName}
                      onChangeText={setNewName}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Register Number</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. CS2024001"
                      placeholderTextColor={COLORS.textSecondary}
                      autoCapitalize="characters"
                      value={newRegNo}
                      onChangeText={setNewRegNo}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. john.doe@university.edu"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={newEmail}
                      onChangeText={setNewEmail}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Date of Birth</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. DD-MM-YYYY or YYYY-MM-DD"
                      placeholderTextColor={COLORS.textSecondary}
                      value={newDob}
                      onChangeText={setNewDob}
                    />
                  </View>
                </ScrollView>

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
                      (!newName.trim() || !newRegNo.trim() || !newEmail.trim() || !newDob.trim()) && styles.saveBtnDisabled
                    ]}
                    onPress={handleAddStudent}
                    disabled={!newName.trim() || !newRegNo.trim() || !newEmail.trim() || !newDob.trim()}
                  >
                    <Text style={styles.saveBtnText}>Save Student</Text>
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
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
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
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  studentSub: {
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
    maxHeight: '90%', // Prevent modal from exceeding screen height when many inputs are stacked
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
  formScroll: {
    // Allows internal scrolling if the keyboard pushes it too high
  },
  inputGroup: {
    marginBottom: 20,
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

export default TutorStudentsScreen;
