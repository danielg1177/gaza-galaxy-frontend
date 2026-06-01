import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

const COLORS = {
  background: '#f5f0eb',
  accent: '#4060c8',
  accentDim: '#e2e8f8',
  textMuted: '#6a6880',
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

function LogoutButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.logoutButton, pressed && styles.navButtonPressed]}
      onPress={onPress}
    >
      <Text style={styles.logoutButtonText}>Log out</Text>
    </Pressable>
  );
}

export function AppTopBar({
  pendingRequestCount,
  onFriendsPress,
  showFriendsButton = true,
}: {
  pendingRequestCount: number;
  onFriendsPress: () => void;
  showFriendsButton?: boolean;
}) {
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert('Log out?', 'You will need to sign in again to continue.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  return (
    <View style={styles.topBar}>
      {showFriendsButton ? (
        <FriendsNavButton pendingCount={pendingRequestCount} onPress={onFriendsPress} />
      ) : (
        <View style={styles.topBarSide} />
      )}
      <LogoutButton onPress={handleLogout} />
    </View>
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
});
