import { ActivityIndicator, Pressable, StyleSheet, Text, View, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { showConfirm } from '../utils/webAlert';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../../App';

const COLORS = {
  background: '#f5f0eb',
  panel: '#ffffff',
  accent: '#4060c8',
  accentDim: '#e2e8f8',
  text: '#1a1a2e',
  textMuted: '#6a6880',
  border: '#d8d4ce',
};

function FriendsNavButton({
  pendingCount,
  onPress,
}: {
  pendingCount: number;
  onPress: () => void;
}) {
  const badgeLabel = pendingCount > 9 ? '9+' : String(pendingCount);

  return (
    <Pressable
      style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
      onPress={onPress}
    >
      <Text style={styles.friendsButtonText}>Friends</Text>
      {pendingCount > 0 && (
        <View style={styles.friendsBadge}>
          <Text style={styles.friendsBadgeText}>{badgeLabel}</Text>
        </View>
      )}
    </Pressable>
  );
}

function RefreshButton({
  isRefreshing,
  onPress,
}: {
  isRefreshing: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.refreshButton,
        pressed && !isRefreshing && styles.navButtonPressed,
        isRefreshing && styles.refreshButtonDisabled,
      ]}
      onPress={onPress}
      disabled={isRefreshing}
    >
      {isRefreshing ? (
        <ActivityIndicator color={COLORS.accent} size="small" />
      ) : (
        <Text style={styles.refreshButtonText}>Refresh</Text>
      )}
    </Pressable>
  );
}

function MenuButton({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuButton, pressed && styles.navButtonPressed]}
      onPress={onPress}
      hitSlop={8}
    >
      <Text style={styles.menuButtonText}>⋮</Text>
    </Pressable>
  );
}

function HelpButton({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.helpButton, pressed && styles.navButtonPressed]}
      onPress={onPress}
      hitSlop={8}
    >
      <Text style={styles.helpButtonText}>?</Text>
    </Pressable>
  );
}

function MenuDropdown({
  visible,
  onClose,
  onLogoutPress,
}: {
  visible: boolean;
  onClose: () => void;
  onLogoutPress: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.menuBackdrop}
        onPress={onClose}
      >
        <Pressable
          style={styles.menuDropdown}
          onPress={() => {}}
        >
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
            onPress={() => {
              onLogoutPress();
              onClose();
            }}
          >
            <Text style={styles.menuItemText}>Log out</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function AppTopBar({
  pendingRequestCount,
  onFriendsPress,
  showFriendsButton = true,
  onRefreshPress,
  isRefreshing = false,
}: {
  pendingRequestCount: number;
  onFriendsPress: () => void;
  showFriendsButton?: boolean;
  onRefreshPress?: () => void;
  isRefreshing?: boolean;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const logout = useAuthStore((s) => s.logout);
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = () => {
    showConfirm('Log out?', 'You will need to sign in again to continue.', () => {
      void logout();
    });
  };

  const handleRulesPress = () => {
    navigation.navigate('Rules' as any);
  };

  return (
    <>
      <View style={styles.topBar}>
        {showFriendsButton ? (
          <FriendsNavButton pendingCount={pendingRequestCount} onPress={onFriendsPress} />
        ) : (
          <View style={styles.topBarSide} />
        )}
        <View style={styles.topBarActions}>
          {onRefreshPress != null && (
            <RefreshButton isRefreshing={isRefreshing} onPress={onRefreshPress} />
          )}
          <HelpButton onPress={handleRulesPress} />
          <MenuButton onPress={() => setMenuVisible(true)} />
        </View>
      </View>
      <MenuDropdown
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onLogoutPress={handleLogout}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  topBarSide: {
    minWidth: 1,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    position: 'relative',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.accentDim,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  navButtonPressed: {
    opacity: 0.85,
  },
  friendsButtonText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  friendsBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  friendsBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  refreshButton: {
    minWidth: 72,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.accentDim,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonDisabled: {
    opacity: 0.7,
  },
  refreshButtonText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    backgroundColor: COLORS.background,
  },
  logoutButtonText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  helpButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.accentDim,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  helpButtonText: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  menuButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    color: COLORS.textMuted,
    fontSize: 20,
    lineHeight: 24,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingRight: 8,
  },
  menuDropdown: {
    backgroundColor: COLORS.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 140,
    overflow: 'hidden',
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
});
