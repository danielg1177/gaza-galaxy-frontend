import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../App';
import { ApiError } from '../services/apiClient';
import {
  deleteGame as deleteApiGame,
  humanSeatCounts,
  isCurrentUserGameCreator,
  joinOpenGame,
  leaveOpenGame,
  listGames,
  listOpenGames,
  type ApiGame,
  type ApiOpenGame,
} from '../services/gamesService';
import { apiGameToOpenLobby, startMatchmakingFromLobby } from '../services/matchmaking';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { showAlert, showConfirm } from '../utils/webAlert';

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

type FindGameNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FindGame'>;
type FindGameRoute = RouteProp<RootStackParamList, 'FindGame'>;
type FindGameTab = 'open' | 'pending';

function formatMapSize(value: string | undefined): string {
  if (value === 'small' || value === 'medium' || value === 'large') {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  return 'Medium';
}

function formatSeatCount(filled: number, total: number): string {
  return `${filled}/${total}`;
}

export default function FindGameScreen() {
  const navigation = useNavigation<FindGameNavigationProp>();
  const route = useRoute<FindGameRoute>();
  const currentUser = useAuthStore((s) => s.currentUser);
  const loadAsyncGame = useGameStore((s) => s.loadAsyncGame);

  const [tab, setTab] = useState<FindGameTab>(route.params?.tab ?? 'open');
  const [openGames, setOpenGames] = useState<ApiOpenGame[]>([]);
  const [pendingGames, setPendingGames] = useState<ApiGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionGameId, setActionGameId] = useState<number | null>(null);

  const refresh = useCallback(async (showSpinner: boolean): Promise<void> => {
    if (showSpinner) {
      setIsRefreshing(true);
    }
    try {
      const [openResult, myGames] = await Promise.all([
        listOpenGames().catch(() => ({ games: [] as ApiOpenGame[], count: 0 })),
        listGames().catch(() => [] as ApiGame[]),
      ]);
      setOpenGames(openResult.games);
      setPendingGames(
        myGames.filter(
          (game) => game.status === 'waiting_for_players' && game.isOpenLobby === true,
        ),
      );
    } finally {
      setIsLoading(false);
      if (showSpinner) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh(false);
    }, [refresh]),
  );

  const openCount = openGames.length;
  const pendingCount = pendingGames.length;

  const handleJoin = (lobby: ApiOpenGame) => {
    if (actionGameId !== null) {
      return;
    }
    setActionGameId(lobby.id);
    void (async () => {
      try {
        const result = await joinOpenGame(lobby.id);
        if (result.shouldStart) {
          const started = await startMatchmakingFromLobby(result.game);
          loadAsyncGame({
            ...started.game,
            stateJson: started.stateJson,
            inProgressActions: null,
            latestEvents: [],
          });
          if (started.game.isMyTurn) {
            navigation.navigate('Game');
          } else {
            navigation.navigate('Home');
          }
          return;
        }
        setTab('pending');
        await refresh(false);
      } catch (err) {
        showAlert(
          'Could not join',
          err instanceof ApiError ? err.message : 'Try again.',
        );
        await refresh(false);
      } finally {
        setActionGameId(null);
      }
    })();
  };

  const handleStart = (game: ApiGame) => {
    if (actionGameId !== null) {
      return;
    }
    const seats = humanSeatCounts(game.players);
    if (seats.filled < seats.total) {
      return;
    }
    setActionGameId(game.id);
    void (async () => {
      try {
        const started = await startMatchmakingFromLobby(apiGameToOpenLobby(game));
        loadAsyncGame({
          ...started.game,
          stateJson: started.stateJson,
          inProgressActions: null,
          latestEvents: [],
        });
        if (started.game.isMyTurn) {
          navigation.navigate('Game');
        } else {
          navigation.navigate('Home');
        }
      } catch (err) {
        showAlert(
          'Could not start',
          err instanceof ApiError ? err.message : 'Try again.',
        );
        await refresh(false);
      } finally {
        setActionGameId(null);
      }
    })();
  };

  const handleLeave = (game: ApiGame) => {
    if (actionGameId !== null) {
      return;
    }
    showConfirm('Leave lobby?', 'Your seat will open for someone else.', () => {
      setActionGameId(game.id);
      void (async () => {
        try {
          await leaveOpenGame(game.id);
          await refresh(false);
        } catch (err) {
          showAlert(
            'Could not leave',
            err instanceof ApiError ? err.message : 'Try again.',
          );
        } finally {
          setActionGameId(null);
        }
      })();
    });
  };

  const handleDelete = (game: ApiGame) => {
    if (actionGameId !== null) {
      return;
    }
    showConfirm(
      'Delete Game',
      'This will cancel the lobby for everyone waiting.',
      () => {
        setActionGameId(game.id);
        void (async () => {
          try {
            await deleteApiGame(game.id);
            await refresh(false);
          } catch (err) {
            showAlert(
              'Could not delete',
              err instanceof ApiError ? err.message : 'Try again.',
            );
          } finally {
            setActionGameId(null);
          }
        })();
      },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh(true)}
            tintColor={COLORS.accent}
          />
        }
      >
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>MULTIPLAYER</Text>
          <Text style={styles.title}>Find Game</Text>
          <View style={styles.titleRule} />
          <Text style={styles.subtitle}>
            Join an open lobby or wait for your pending games to fill.
          </Text>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            style={({ pressed }) => [
              styles.tabChip,
              tab === 'open' && styles.tabChipSelected,
              pressed && tab !== 'open' && styles.tabChipPressed,
            ]}
            onPress={() => setTab('open')}
          >
            <Text style={[styles.tabChipText, tab === 'open' && styles.tabChipTextSelected]}>
              Open
            </Text>
            {openCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{openCount > 9 ? '9+' : openCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.tabChip,
              tab === 'pending' && styles.tabChipSelected,
              pressed && tab !== 'pending' && styles.tabChipPressed,
            ]}
            onPress={() => setTab('pending')}
          >
            <Text
              style={[styles.tabChipText, tab === 'pending' && styles.tabChipTextSelected]}
            >
              Pending
            </Text>
            {pendingCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {pendingCount > 9 ? '9+' : pendingCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={COLORS.accent} />
        ) : tab === 'open' ? (
          openGames.length === 0 ? (
            <Text style={styles.emptyText}>
              No open games right now.{'\n'}Create one from Command Center.
            </Text>
          ) : (
            <View style={styles.cardList}>
              {openGames.map((lobby) => (
                <OpenLobbyCard
                  key={lobby.id}
                  lobby={lobby}
                  isBusy={actionGameId === lobby.id}
                  disabled={actionGameId !== null}
                  onJoin={() => handleJoin(lobby)}
                />
              ))}
            </View>
          )
        ) : pendingGames.length === 0 ? (
          <Text style={styles.emptyText}>You are not waiting in any lobbies.</Text>
        ) : (
          <View style={styles.cardList}>
            {pendingGames.map((game) => (
              <PendingLobbyCard
                key={game.id}
                game={game}
                currentUserId={currentUser?.id}
                currentUsername={currentUser?.username}
                isBusy={actionGameId === game.id}
                disabled={actionGameId !== null}
                onStart={() => handleStart(game)}
                onLeave={() => handleLeave(game)}
                onDelete={() => handleDelete(game)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function OpenLobbyCard({
  lobby,
  isBusy,
  disabled,
  onJoin,
}: {
  lobby: ApiOpenGame;
  isBusy: boolean;
  disabled: boolean;
  onJoin: () => void;
}) {
  const filledNames = lobby.players
    .filter((player) => !player.isAi && player.userId != null)
    .map((player) => player.inGameName)
    .join(', ');

  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{lobby.name}</Text>
      <Text style={styles.cardMeta}>
        Host: {lobby.host?.username ?? 'Unknown'}
      </Text>
      <Text style={styles.cardMeta}>
        Map {formatMapSize(lobby.mapConfig.mapSize)} · Humans{' '}
        {formatSeatCount(lobby.humanFilled, lobby.humanTotal)}
        {lobby.aiCount > 0 ? ` · ${lobby.aiCount} AI` : ''}
      </Text>
      {filledNames.length > 0 && (
        <Text style={styles.cardPlayers}>{filledNames}</Text>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          (pressed || isBusy || disabled) && styles.buttonPressed,
        ]}
        onPress={onJoin}
        disabled={isBusy || disabled}
      >
        {isBusy ? (
          <ActivityIndicator color={COLORS.background} size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Join</Text>
        )}
      </Pressable>
    </View>
  );
}

function PendingLobbyCard({
  game,
  currentUserId,
  currentUsername,
  isBusy,
  disabled,
  onStart,
  onLeave,
  onDelete,
}: {
  game: ApiGame;
  currentUserId: number | undefined;
  currentUsername: string | undefined;
  isBusy: boolean;
  disabled: boolean;
  onStart: () => void;
  onLeave: () => void;
  onDelete: () => void;
}) {
  const seats = humanSeatCounts(game.players);
  const isCreator = isCurrentUserGameCreator(game, currentUserId, currentUsername);
  const isFull = seats.filled >= seats.total && seats.total > 0;
  const filledNames = game.players
    .filter((player) => !player.isAi && player.userId != null)
    .map((player) => player.inGameName)
    .join(', ');

  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{game.name}</Text>
      <Text style={styles.cardMeta}>
        Map {formatMapSize(game.mapConfig?.mapSize)} · Humans{' '}
        {formatSeatCount(seats.filled, seats.total)}
        {seats.aiCount > 0 ? ` · ${seats.aiCount} AI` : ''}
      </Text>
      {filledNames.length > 0 && (
        <Text style={styles.cardPlayers}>{filledNames}</Text>
      )}
      {isFull && (
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || isBusy || disabled) && styles.buttonPressed,
          ]}
          onPress={onStart}
          disabled={isBusy || disabled}
        >
          {isBusy ? (
            <ActivityIndicator color={COLORS.background} size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Start Game</Text>
          )}
        </Pressable>
      )}
      <View style={styles.pendingActions}>
        {isCreator ? (
          <Pressable
            style={({ pressed }) => [
              styles.dangerButton,
              (pressed || isBusy || disabled) && styles.buttonPressed,
            ]}
            onPress={onDelete}
            disabled={isBusy || disabled}
          >
            <Text style={styles.dangerButtonText}>Delete</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              (pressed || isBusy || disabled) && styles.buttonPressed,
            ]}
            onPress={onLeave}
            disabled={isBusy || disabled}
          >
            <Text style={styles.secondaryButtonText}>Leave</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
    marginTop: 8,
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
    marginBottom: 24,
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 0.5,
    lineHeight: 40,
  },
  titleRule: {
    width: 48,
    height: 3,
    backgroundColor: COLORS.accent,
    marginTop: 12,
    marginBottom: 12,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  tabChipSelected: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  tabChipPressed: {
    borderColor: COLORS.textMuted,
  },
  tabChipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabChipTextSelected: {
    color: COLORS.accent,
  },
  tabBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: '700',
  },
  loader: {
    marginTop: 24,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 32,
  },
  cardList: {
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  cardName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardMeta: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  cardPlayers: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  dangerButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
  },
});
