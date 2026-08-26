import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../App';
import { FORMER_PLAYER_NAME } from '../constants/app';
import { ApiError } from '../services/apiClient';
import { useAuthStore } from '../store/authStore';
import { showConfirm } from '../utils/webAlert';

const BG_COLOR = '#f5f0eb';

const COLORS = {
  background: '#f5f0eb',
  text: '#1c1c2e',
  textMuted: '#6a6880',
  accent: '#4060c8',
  accentDim: '#e2e8f8',
  panel: '#faf7f4',
  border: '#ccc4b8',
  error: '#c0392b',
  success: '#2e8a50',
};

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/;

type SettingsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

function getApiErrorMessages(error: ApiError): string[] {
  if (error.errors) {
    const fieldMessages = Object.values(error.errors)
      .map((messages) => messages[0])
      .filter((message): message is string => message !== undefined && message.length > 0);
    if (fieldMessages.length > 0) {
      return fieldMessages;
    }
  }
  return [error.message];
}

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNavigationProp>();
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateUsername = useAuthStore((s) => s.updateUsername);
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const [username, setUsername] = useState(currentUser?.username ?? '');
  const [usernameErrors, setUsernameErrors] = useState<string[]>([]);
  const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null);
  const [usernameLoading, setUsernameLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleLogout = () => {
    showConfirm('Log out?', 'You will need to sign in again to continue.', () => {
      void useAuthStore.getState().logout();
    });
  };

  const handleSaveUsername = async () => {
    const nextUsername = username.trim();
    setUsernameErrors([]);
    setUsernameSuccess(null);

    if (!USERNAME_PATTERN.test(nextUsername)) {
      setUsernameErrors(['Username must be 3–32 characters: letters, numbers, or underscores.']);
      return;
    }

    if (nextUsername === currentUser?.username) {
      setUsernameSuccess('Username is already up to date.');
      return;
    }

    setUsernameLoading(true);
    try {
      await updateUsername(nextUsername);
      setUsername(nextUsername);
      setUsernameSuccess('Username updated.');
    } catch (err) {
      if (err instanceof ApiError) {
        setUsernameErrors(getApiErrorMessages(err));
      } else {
        setUsernameErrors(['Could not update username. Try again.']);
      }
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordErrors([]);
    setPasswordSuccess(null);

    if (currentPassword.length === 0) {
      setPasswordErrors(['Enter your current password.']);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordErrors(['New password must be at least 6 characters.']);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrors(['New passwords do not match.']);
      return;
    }

    setPasswordLoading(true);
    try {
      await updatePassword(currentPassword, newPassword, confirmPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password updated.');
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordErrors(getApiErrorMessages(err));
      } else {
        setPasswordErrors(['Could not update password. Try again.']);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const runDeleteAccount = async () => {
    setDeleteErrors([]);
    if (deletePassword.length === 0) {
      setDeleteErrors(['Enter your current password to delete your account.']);
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteAccount(deletePassword);
    } catch (err) {
      if (err instanceof ApiError) {
        setDeleteErrors(getApiErrorMessages(err));
      } else {
        setDeleteErrors(['Could not delete account. Try again.']);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    if (deletePassword.length === 0) {
      setDeleteErrors(['Enter your current password to delete your account.']);
      return;
    }

    showConfirm(
      'Delete account?',
      `This cannot be undone. In-progress campaigns continue with the AI commanding your empire, or end if you are the last human. Waiting lobbies you created are cancelled. Chat with other players stays, with your name shown as ${FORMER_PLAYER_NAME}.`,
      () => {
        void runDeleteAccount();
      },
    );
  };

  const renderNavMenuDropdown = () => (
    <Modal
      visible={menuVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setMenuVisible(false)}
    >
      <Pressable
        style={styles.menuModalBackdrop}
        onPress={() => setMenuVisible(false)}
      >
        <Pressable style={styles.menuDropdown} onPress={() => {}}>
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('Friends');
            }}
          >
            <Text style={styles.menuItemText}>👥 Friends</Text>
          </Pressable>
          <View style={styles.menuDivider} />
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('Rules');
            }}
          >
            <Text style={styles.menuItemText}>📖 Rules</Text>
          </Pressable>
          <View style={styles.menuDivider} />
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('Settings');
            }}
          >
            <Text style={styles.menuItemText}>⚙️ Settings</Text>
          </Pressable>
          <View style={styles.menuDivider} />
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
            onPress={() => {
              setMenuVisible(false);
              handleLogout();
            }}
          >
            <Text style={styles.menuItemText}>Log out</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const busy = usernameLoading || passwordLoading || deleteLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderNavMenuDropdown()}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.navRow}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.navMenuButton, pressed && styles.navMenuButtonPressed]}
              onPress={() => setMenuVisible(true)}
              hitSlop={8}
            >
              <Text style={styles.navMenuButtonText}>⋮</Text>
            </Pressable>
          </View>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>ACCOUNT</Text>
            <Text style={styles.title}>Settings</Text>
            <View style={styles.titleRule} />
            <Text style={styles.subtitle}>Change your username or password, or delete your account.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Username (3–32 chars, letters/numbers/_)"
              placeholderTextColor={COLORS.textMuted}
              value={username}
              onChangeText={(value) => {
                setUsername(value);
                setUsernameErrors([]);
                setUsernameSuccess(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              maxLength={32}
            />
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                (pressed || usernameLoading) && styles.submitButtonPressed,
              ]}
              onPress={() => void handleSaveUsername()}
              disabled={busy}
            >
              {usernameLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Save Username</Text>
              )}
            </Pressable>
            {usernameSuccess !== null && (
              <Text style={styles.successText}>{usernameSuccess}</Text>
            )}
            {usernameErrors.length > 0 && (
              <View style={styles.errorContainer}>
                {usernameErrors.map((message, index) => (
                  <Text key={index} style={styles.errorText}>
                    {message}
                  </Text>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Current password"
              placeholderTextColor={COLORS.textMuted}
              value={currentPassword}
              onChangeText={(value) => {
                setCurrentPassword(value);
                setPasswordErrors([]);
                setPasswordSuccess(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={COLORS.textMuted}
              value={newPassword}
              onChangeText={(value) => {
                setNewPassword(value);
                setPasswordErrors([]);
                setPasswordSuccess(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.textMuted}
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setPasswordErrors([]);
                setPasswordSuccess(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                (pressed || passwordLoading) && styles.submitButtonPressed,
              ]}
              onPress={() => void handleSavePassword()}
              disabled={busy}
            >
              {passwordLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Save Password</Text>
              )}
            </Pressable>
            {passwordSuccess !== null && (
              <Text style={styles.successText}>{passwordSuccess}</Text>
            )}
            {passwordErrors.length > 0 && (
              <View style={styles.errorContainer}>
                {passwordErrors.map((message, index) => (
                  <Text key={index} style={styles.errorText}>
                    {message}
                  </Text>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Delete account</Text>
            <Text style={styles.dangerCopy}>
              Permanently remove your account. Other players keep shared campaigns; you cannot rejoin.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Current password"
              placeholderTextColor={COLORS.textMuted}
              value={deletePassword}
              onChangeText={(value) => {
                setDeletePassword(value);
                setDeleteErrors([]);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
            <Pressable
              style={({ pressed }) => [
                styles.deleteButton,
                (pressed || deleteLoading) && styles.submitButtonPressed,
              ]}
              onPress={handleDeleteAccount}
              disabled={busy}
            >
              {deleteLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Delete account</Text>
              )}
            </Pressable>
            {deleteErrors.length > 0 && (
              <View style={styles.errorContainer}>
                {deleteErrors.map((message, index) => (
                  <Text key={index} style={styles.errorText}>
                    {message}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  navMenuButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navMenuButtonPressed: {
    opacity: 0.7,
  },
  navMenuButtonText: {
    color: COLORS.textMuted,
    fontSize: 20,
    lineHeight: 24,
  },
  menuModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 24,
  },
  menuDropdown: {
    backgroundColor: COLORS.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 140,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  menuItemPressed: {
    backgroundColor: COLORS.accentDim,
  },
  menuItemText: {
    color: COLORS.text,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  header: {
    marginTop: 8,
    marginBottom: 24,
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: 11,
    letterSpacing: 4,
    marginBottom: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 40,
    fontWeight: '200',
    letterSpacing: 6,
    lineHeight: 48,
  },
  titleRule: {
    width: 48,
    height: 2,
    backgroundColor: COLORS.accent,
    marginTop: 16,
    marginBottom: 12,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 32,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  successText: {
    color: COLORS.success,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  errorContainer: {
    marginTop: 12,
    gap: 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    lineHeight: 20,
  },
  dangerCopy: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
});
