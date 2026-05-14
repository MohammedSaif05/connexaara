import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { getProfile, updateProfile, changePassword, UserProfile } from '../../services/api';
import { clearAuthData } from '../../services/storage';
import EditIcon from '../../assets/svg/edit.svg';

const COLORS = {
  background: '#F5F7FA',
  textPrimary: '#1B2A4A',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  border: '#E5E7EB',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
};

interface SharedProfileScreenProps {
  navigation: any;
  role: 'HOD' | 'TUTOR' | 'STUDENT';
  colorTheme: {
    main: string;
    light: string;
  };
}

const SharedProfileScreen: React.FC<SharedProfileScreenProps> = ({ navigation, role, colorTheme }) => {
  const insets = useSafeAreaInsets();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Image Uploading state
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Image Viewer state
  const [showImageViewer, setShowImageViewer] = useState(false);
  
  // Feedback Modal
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Logout Modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const data = await getProfile();
      setProfile(data);
      setEditName(data.name);
      setEditPhone(data.phoneNumber || '');
      setEditBio(data.bio || '');
    } catch (err: any) {
      showFeedback('error', 'Error', err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile(true);
  }, []);

  const showFeedback = (type: 'success' | 'error', title: string, message: string) => {
    setFeedbackType(type);
    setFeedbackTitle(title);
    setFeedbackMessage(message);
    setFeedbackVisible(true);
  };

  const handlePickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.didCancel || !result.assets?.length) return;
    
    const asset = result.assets[0];
    
    try {
      setUploadingImage(true);
      const updated = await updateProfile({ file: asset });
      setProfile(updated);
      showFeedback('success', 'Profile Photo Updated', 'Your profile photo has been successfully updated.');
    } catch (err: any) {
      showFeedback('error', 'Upload Failed', err.message || 'Failed to update profile photo.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const updated = await updateProfile({
        name: editName,
        phoneNumber: editPhone,
        bio: editBio,
      });
      setProfile(updated);
      setIsEditing(false);
      showFeedback('success', 'Profile Updated', 'Your personal details have been updated.');
    } catch (err: any) {
      showFeedback('error', 'Update Failed', err.message || 'Failed to update personal details.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setEditName(profile.name);
      setEditPhone(profile.phoneNumber || '');
      setEditBio(profile.bio || '');
    }
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      showFeedback('error', 'Validation Error', 'Please fill all password fields.');
      return;
    }
    try {
      setPasswordSaving(true);
      await changePassword(currentPassword, newPassword);
      showFeedback('success', 'Password Changed', 'Your password has been changed successfully.');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      showFeedback('error', 'Change Failed', err.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await clearAuthData();
      setShowLogoutModal(false);
      // Reset navigation stack to Login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (err) {
      showFeedback('error', 'Error', 'Failed to log out');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colorTheme.main} />
      </View>
    );
  }

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colorTheme.main]}
            tintColor={colorTheme.main}
          />
        }
      >
        {/* Header Background */}
        <View style={[styles.headerBg, { backgroundColor: colorTheme.main, paddingTop: insets.top + 20 }]} />
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity onPress={() => setShowImageViewer(true)} activeOpacity={0.8} style={styles.avatarContainer}>
              {profile.profileImageUrl ? (
                <Image source={{ uri: profile.profileImageUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colorTheme.light }]}>
                  <Text style={[styles.avatarInitial, { color: colorTheme.main }]}>
                    {profile.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {uploadingImage && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={[styles.editBadge, { backgroundColor: colorTheme.main }]}>
              <EditIcon width={16} height={16} color={COLORS.white} stroke={COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.roleBadge}>
            <Text style={[styles.roleBadgeText, { color: colorTheme.main }]}>{role}</Text>
          </View>
          <Text style={styles.userName}>{profile.name}</Text>
          <Text style={styles.userEmail}>{profile.email}</Text>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={[styles.editBtnText, { color: colorTheme.main }]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Name</Text>
            {isEditing ? (
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Your Name" />
            ) : (
              <Text style={styles.fieldValue}>{profile.name}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {isEditing ? (
              <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="Add phone number" keyboardType="phone-pad" />
            ) : (
              <Text style={styles.fieldValue}>{profile.phoneNumber || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Bio</Text>
            {isEditing ? (
              <TextInput style={[styles.input, styles.bioInput]} value={editBio} onChangeText={setEditBio} placeholder="Write a short bio" multiline />
            ) : (
              <Text style={styles.fieldValue}>{profile.bio || 'Not provided'}</Text>
            )}
          </View>

          {isEditing && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colorTheme.main }]} onPress={handleSaveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <TouchableOpacity style={styles.settingItem} onPress={() => setShowPasswordModal(true)}>
            <Text style={styles.settingText}>Change Password</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingItem, { borderBottomWidth: 0 }]} onPress={() => setShowLogoutModal(true)}>
            <Text style={[styles.settingText, { color: COLORS.danger }]}>Log Out</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput style={styles.modalInput} placeholder="Current Password" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
            <TextInput style={styles.modalInput} placeholder="New Password" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
            
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colorTheme.main }]} onPress={handleChangePassword} disabled={passwordSaving}>
                {passwordSaving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.modalSaveText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.warningIconContainer}>
              <Text style={{ fontSize: 32 }}>🚪</Text>
            </View>
            <Text style={styles.modalTitle}>Log Out?</Text>
            <Text style={styles.modalDesc}>Are you sure you want to log out from your account?</Text>
            
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: COLORS.danger }]} onPress={handleLogout}>
                <Text style={styles.modalSaveText}>Yes, Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Feedback Modal */}
      <Modal visible={feedbackVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setFeedbackVisible(false)}>
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
            <View style={[styles.feedbackIconContainer, { backgroundColor: feedbackType === 'success' ? '#D1FAE5' : COLORS.dangerLight }]}>
              <Text style={{ fontSize: 32 }}>{feedbackType === 'success' ? '✅' : '❌'}</Text>
            </View>
            <Text style={styles.modalTitle}>{feedbackTitle}</Text>
            <Text style={styles.modalDesc}>{feedbackMessage}</Text>
            
            <TouchableOpacity style={[styles.modalSaveBtn, { width: '100%', backgroundColor: feedbackType === 'success' ? colorTheme.main : COLORS.danger }]} onPress={() => setFeedbackVisible(false)}>
              <Text style={styles.modalSaveText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal visible={showImageViewer} transparent animationType="fade">
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.viewerCloseBtn} onPress={() => setShowImageViewer(false)}>
            <Text style={styles.viewerCloseText}>✕</Text>
          </TouchableOpacity>
          {profile.profileImageUrl ? (
            <Image source={{ uri: profile.profileImageUrl }} style={styles.viewerImage} resizeMode="contain" />
          ) : (
            <View style={[styles.viewerPlaceholder, { backgroundColor: colorTheme.light }]}>
              <Text style={[styles.viewerInitial, { color: colorTheme.main }]}>
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerBg: { height: 180, width: '100%', position: 'absolute', top: 0 },
  profileCard: { backgroundColor: COLORS.white, margin: 20, marginTop: 100, borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  
  avatarWrapper: { position: 'relative', marginTop: -50, marginBottom: 16 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.white, padding: 4 },
  avatar: { width: '100%', height: '100%', borderRadius: 50 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 36, fontWeight: '800' },
  avatarLoadingOverlay: { position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderRadius: 46, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.white },
  editBadgeText: { fontSize: 14 },
  
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#F3F4F6', marginBottom: 8 },
  roleBadgeText: { fontSize: 12, fontWeight: '700' },
  userName: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  userEmail: { fontSize: 14, color: COLORS.textSecondary },
  
  section: { backgroundColor: COLORS.white, marginHorizontal: 20, marginBottom: 20, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  editBtnText: { fontSize: 16, fontWeight: '700' },
  
  fieldContainer: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6, fontWeight: '600' },
  fieldValue: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '500' },
  input: { backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  bioInput: { height: 80, textAlignVertical: 'top' },
  
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  settingText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  chevron: { fontSize: 24, color: COLORS.textSecondary },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(27, 42, 74, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: COLORS.white, borderRadius: 24, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 20 },
  modalInput: { width: '100%', backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  modalActionRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 },
  modalCancelBtn: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  modalSaveBtn: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalSaveText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  modalCloseBtn: { position: 'absolute', top: 16, right: 16, padding: 5, zIndex: 10 },
  modalCloseBtnText: { fontSize: 20, color: COLORS.textSecondary, fontWeight: 'bold' },
  warningIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.dangerLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  feedbackIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  viewerCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
  viewerCloseText: { color: COLORS.white, fontSize: 30, fontWeight: 'bold' },
  viewerImage: { width: '100%', height: '80%' },
  viewerPlaceholder: { width: 200, height: 200, borderRadius: 100, justifyContent: 'center', alignItems: 'center' },
  viewerInitial: { fontSize: 80, fontWeight: '800' },
});

export default SharedProfileScreen;
