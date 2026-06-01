import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { showConfirm } from '../utils/webAlert';
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
  onRefreshPress,
  isRefreshing = false,
}: {
  pendingRequestCount: number;
  onFriendsPress: () => void;
  showFriendsButton?: boolean;
  onRefreshPress?: () => void;
  isRefreshing?: boolean;
}) {
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    showConfirm('Log out?', 'You will need to sign in again to continue.', () => {
      void logout();
    });
  };

  return (
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
        <LogoutButton onPress={handleLogout} />
      </View>
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
});
