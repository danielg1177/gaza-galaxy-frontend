import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { showAlert, showConfirm } from '../utils/webAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../App';
import { AppTopBar } from '../components/AppTopBar';
import { ApiError } from '../services/apiClient';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  type Friend,
  type FriendRequest,
  type UserSearchResult,
} from '../services/friendsService';

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
};

type FriendsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Friends'>;

function getSearchActionLabel(status: UserSearchResult['friendshipStatus']): string {
  switch (status) {
    case 'none':
      return 'Add Friend';
    case 'pending_sent':
      return 'Request Sent';
    case 'pending_received':
      return 'Respond in Requests';
    case 'accepted':
      return 'Already Friends';
  }
}

function isSearchActionDisabled(status: UserSearchResult['friendshipStatus']): boolean {
  return status !== 'none';
}

export default function FriendsScreen() {
  const navigation = useNavigation<FriendsNavigationProp>();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[] | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  const setActionPending = (key: string, pending: boolean) => {
    setPendingActions((prev) => {
      const next = new Set(prev);
      if (pending) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const isActionPending = (key: string) => pendingActions.has(key);

  const loadLists = useCallback(async () => {
    const [friendsList, requestsList] = await Promise.all([
      getFriends(),
      getFriendRequests(),
    ]);
    setFriends(friendsList);
    setRequests(requestsList);
    setLoadError(null);
  }, []);

  useEffect(() => {
    void (async () => {
      setIsInitialLoading(true);
      try {
        await loadLists();
      } catch (err) {
        setLoadError(
          err instanceof ApiError ? err.message : 'Failed to load friends. Try again.',
        );
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, [loadLists]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadLists();
    } catch (err) {
      showAlert(
        'Refresh failed',
        err instanceof ApiError ? err.message : 'Could not refresh friends.',
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRetryLoad = async () => {
    setIsInitialLoading(true);
    setLoadError(null);
    try {
      await loadLists();
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : 'Failed to load friends. Try again.',
      );
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (err) {
      showAlert(
        'Search failed',
        err instanceof ApiError ? err.message : 'Could not search users.',
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (user: UserSearchResult) => {
    const key = `add:${user.id}`;
    setActionPending(key, true);
    try {
      await sendFriendRequest(user.username);
      setSearchResults((prev) =>
        prev?.map((row) =>
          row.id === user.id ? { ...row, friendshipStatus: 'pending_sent' as const } : row,
        ) ?? null,
      );
    } catch (err) {
      showAlert(
        'Request failed',
        err instanceof ApiError ? err.message : 'Could not send friend request.',
      );
    } finally {
      setActionPending(key, false);
    }
  };

  const handleAccept = async (request: FriendRequest) => {
    const key = `accept:${request.friendshipId}`;
    setActionPending(key, true);
    try {
      await acceptFriendRequest(request.friendshipId);
      setRequests((prev) => prev.filter((r) => r.friendshipId !== request.friendshipId));
      setFriends((prev) => [
        { friendshipId: request.friendshipId, user: request.fromUser },
        ...prev,
      ]);
    } catch (err) {
      showAlert(
        'Accept failed',
        err instanceof ApiError ? err.message : 'Could not accept friend request.',
      );
    } finally {
      setActionPending(key, false);
    }
  };

  const handleDecline = async (request: FriendRequest) => {
    const key = `decline:${request.friendshipId}`;
    setActionPending(key, true);
    try {
      await declineFriendRequest(request.friendshipId);
      setRequests((prev) => prev.filter((r) => r.friendshipId !== request.friendshipId));
    } catch (err) {
      showAlert(
        'Decline failed',
        err instanceof ApiError ? err.message : 'Could not decline friend request.',
      );
    } finally {
      setActionPending(key, false);
    }
  };

  const handleRemove = async (friend: Friend) => {
    const key = `remove:${friend.friendshipId}`;
    setActionPending(key, true);
    try {
      await removeFriend(friend.friendshipId);
      setFriends((prev) => prev.filter((f) => f.friendshipId !== friend.friendshipId));
    } catch (err) {
      showAlert(
        'Remove failed',
        err instanceof ApiError ? err.message : 'Could not remove friend.',
      );
    } finally {
      setActionPending(key, false);
    }
  };

  const confirmRemove = (friend: Friend) => {
    showConfirm(
      'Remove Friend',
      `Remove ${friend.user.username} from your friends?`,
      () => void handleRemove(friend),
    );
  };

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppTopBar
          pendingRequestCount={0}
          onFriendsPress={() => navigation.navigate('Friends')}
          showFriendsButton={false}
        />
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppTopBar
        pendingRequestCount={requests.length}
        onFriendsPress={() => navigation.navigate('Friends')}
        showFriendsButton={false}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={COLORS.accent}
          />
        }
      >
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>SOCIAL</Text>
          <Text style={styles.title}>Friends</Text>
          <View style={styles.titleRule} />
          <Text style={styles.subtitle}>Manage friends and incoming requests.</Text>
        </View>

        {loadError !== null && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable
              style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
              onPress={() => void handleRetryLoad()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Find Players</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username…"
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => void handleSearch()}
            />
            <Pressable
              style={({ pressed }) => [
                styles.searchButton,
                pressed && styles.searchButtonPressed,
                isSearching && styles.searchButtonDisabled,
              ]}
              onPress={() => void handleSearch()}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator color={COLORS.background} size="small" />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </Pressable>
          </View>

          {searchResults !== null && (
            <View style={styles.resultsList}>
              {searchResults.length === 0 ? (
                <Text style={styles.emptyText}>No users found.</Text>
              ) : (
                searchResults.map((user) => {
                  const disabled = isSearchActionDisabled(user.friendshipStatus);
                  const addKey = `add:${user.id}`;
                  const addPending = isActionPending(addKey);

                  return (
                    <View key={user.id} style={styles.row}>
                      <Text style={styles.rowUsername}>{user.username}</Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.rowActionButton,
                          disabled && styles.rowActionButtonDisabled,
                          pressed && !disabled && styles.rowActionButtonPressed,
                        ]}
                        onPress={() => void handleAddFriend(user)}
                        disabled={disabled || addPending}
                      >
                        {addPending ? (
                          <ActivityIndicator color={COLORS.accent} size="small" />
                        ) : (
                          <Text
                            style={[
                              styles.rowActionButtonText,
                              disabled && styles.rowActionButtonTextDisabled,
                            ]}
                          >
                            {getSearchActionLabel(user.friendshipStatus)}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Pending Requests</Text>
          {requests.length === 0 ? (
            <Text style={styles.emptyText}>No pending requests.</Text>
          ) : (
            <View style={styles.list}>
              {requests.map((request) => {
                const acceptKey = `accept:${request.friendshipId}`;
                const declineKey = `decline:${request.friendshipId}`;
                const acceptPending = isActionPending(acceptKey);
                const declinePending = isActionPending(declineKey);

                return (
                  <View key={request.friendshipId} style={styles.row}>
                    <Text style={styles.rowUsername}>{request.fromUser.username}</Text>
                    <View style={styles.requestActions}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.acceptButton,
                          pressed && styles.acceptButtonPressed,
                          acceptPending && styles.actionButtonDisabled,
                        ]}
                        onPress={() => void handleAccept(request)}
                        disabled={acceptPending || declinePending}
                      >
                        {acceptPending ? (
                          <ActivityIndicator color={COLORS.background} size="small" />
                        ) : (
                          <Text style={styles.acceptButtonText}>Accept</Text>
                        )}
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [
                          styles.declineButton,
                          pressed && styles.declineButtonPressed,
                          declinePending && styles.actionButtonDisabled,
                        ]}
                        onPress={() => void handleDecline(request)}
                        disabled={acceptPending || declinePending}
                      >
                        {declinePending ? (
                          <ActivityIndicator color={COLORS.textMuted} size="small" />
                        ) : (
                          <Text style={styles.declineButtonText}>Decline</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Friends</Text>
          {friends.length === 0 ? (
            <Text style={styles.emptyText}>No friends yet.</Text>
          ) : (
            <View style={styles.list}>
              {friends.map((friend) => {
                const removeKey = `remove:${friend.friendshipId}`;
                const removePending = isActionPending(removeKey);

                return (
                  <View key={friend.friendshipId} style={styles.row}>
                    <Text style={styles.rowUsername}>{friend.user.username}</Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.removeButton,
                        pressed && styles.removeButtonPressed,
                        removePending && styles.actionButtonDisabled,
                      ]}
                      onPress={() => confirmRemove(friend)}
                      disabled={removePending}
                    >
                      {removePending ? (
                        <ActivityIndicator color={COLORS.textMuted} size="small" />
                      ) : (
                        <Text style={styles.removeButtonText}>Remove</Text>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  backButton: {
    marginTop: 8,
    marginBottom: 8,
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
  errorBox: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryButtonText: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    letterSpacing: 0.5,
  },
  searchButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonPressed: {
    opacity: 0.85,
  },
  searchButtonDisabled: {
    opacity: 0.7,
  },
  searchButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  resultsList: {
    marginTop: 12,
    gap: 10,
  },
  list: {
    gap: 10,
  },
  row: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowUsername: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  rowActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentDim,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowActionButtonPressed: {
    opacity: 0.85,
  },
  rowActionButtonDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  rowActionButtonText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  rowActionButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonPressed: {
    opacity: 0.85,
  },
  acceptButtonText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  declineButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonPressed: {
    borderColor: COLORS.textMuted,
  },
  declineButtonText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  removeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonPressed: {
    borderColor: COLORS.textMuted,
  },
  removeButtonText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
});
