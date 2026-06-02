import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { subscribeHomeRefresh } from '../services/homeRefreshEvents';
import { showAlert, showConfirm } from '../utils/webAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../App';
import { AppTopBar } from '../components/AppTopBar';
import { APP_NAME_UPPER } from '../constants/app';
import type { MapSize } from '../game/types';
import { getFriendRequests, getFriends, type Friend } from '../services/friendsService';
import { ApiError } from '../services/apiClient';
import {
  acceptInvite,
  createGame,
  declineInvite,
  deleteGame as deleteApiGame,
  getGame,
  isCurrentUserGameCreator,
  listGames,
  listInvites,
  type ApiGame,
  type ApiInvite,
} from '../services/gamesService';
import { useAuthStore } from '../store/authStore';
import { generateInitialGameState, useGameStore, type GameConfig, type GameRecord, type PlayerSlot } from '../store/gameStore';

const MAP_SIZE_CONFIG = {
  small: { base: 20, perExtra: 10 },
  medium: { base: 30, perExtra: 15 },
  large: { base: 35, perExtra: 25 },
} as const;

function computeMapDimensions(mapSize: MapSize, playerCount: number) {
  const { base, perExtra } = MAP_SIZE_CONFIG[mapSize];
  const planetCount = base + (playerCount - 2) * perExtra;
  const gridSide = Math.ceil(Math.sqrt(planetCount * 90));
  return { planetCount, width: gridSide, height: gridSide };
}

const MAP_SIZE_LABELS: Record<MapSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

function getDefaultCampaignName(username: string | undefined): string {
  const base = (username ?? 'Commander').trim() || 'Commander';
  return `${base}'s Campaign`;
}

function resolveCampaignName(rawName: string, playerName: string): string {
  const trimmed = rawName.trim();
  if (trimmed.length > 0) {
    return trimmed.slice(0, 100);
  }
  const commander = playerName.trim() || 'Commander';
  return `${commander}'s Campaign`;
}

function isSoloGame(record: GameRecord): boolean {
  if (record.asyncGameId != null) return false;
  return record.config.playerSlots.slice(1).every((slot) => slot.type === 'ai');
}

/** Turn-gating on the lobby applies only to online async games, not pass-and-play. */
function isAsyncMultiplayerApiGame(game: ApiGame): boolean {
  return game.playMode === 'async_multiplayer';
}

function createDefaultPlayerSlots(slot0Name: string): PlayerSlot[] {
  return [
    { type: 'human', name: slot0Name },
    { type: 'ai', difficulty: 'hard' },
  ];
}

const BG_COLOR = '#f5f0eb';

const COLORS = {
  background: '#f5f0eb',
  text: '#1c1c2e',
  textMuted: '#6a6880',
  accent: '#4060c8',
  accentDim: '#e2e8f8',
  panel: '#faf7f4',
  border: '#ccc4b8',
};

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const ALERT_STATE_SORT_PRIORITY: Record<ApiGame['alertState'], number> = {
  in_progress: 0,
  your_turn: 1,
  waiting: 2,
  finished: 3,
  waiting_for_players: 4,
};

type FinishedOutcome = 'victory' | 'defeat' | 'unknown';

function sortAsyncGamesByAlertPriority(games: ApiGame[]): ApiGame[] {
  return [...games].sort(
    (a, b) =>
      ALERT_STATE_SORT_PRIORITY[a.alertState] -
      ALERT_STATE_SORT_PRIORITY[b.alertState],
  );
}

function getFinishedOutcome(game: ApiGame, username: string | undefined): FinishedOutcome {
  if (game.alertState !== 'finished' && game.status !== 'finished') {
    return 'unknown';
  }

  if (username == null || username === '') {
    return 'unknown';
  }

  const nonAiPlayers = game.players.filter((player) => !player.isAi);
  if (!nonAiPlayers.some((player) => player.inGameName === username)) {
    return 'unknown';
  }

  const nonEliminatedNonAi = nonAiPlayers.filter((player) => !player.isEliminated);
  if (
    nonEliminatedNonAi.length === 1 &&
    nonEliminatedNonAi[0].inGameName === username
  ) {
    return 'victory';
  }

  if (nonEliminatedNonAi.length === 1) {
    return 'defeat';
  }

  const userPlayer = nonAiPlayers.find((player) => player.inGameName === username);
  if (userPlayer?.isEliminated) {
    return 'defeat';
  }

  return 'unknown';
}

function AsyncGameCard({
  game,
  isLoading,
  anyCardLoading,
  currentUsername,
  canDelete,
  isDeleting,
  onPress,
  onDelete,
}: {
  game: ApiGame;
  isLoading: boolean;
  anyCardLoading: boolean;
  currentUsername: string | undefined;
  canDelete: boolean;
  isDeleting: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const playerNames = game.players.map((player) => player.inGameName).join(', ');
  const isTappable =
    game.status === 'in_progress' &&
    (!isAsyncMultiplayerApiGame(game) || game.isMyTurn);
  const isProminent =
    game.alertState === 'your_turn' || game.alertState === 'in_progress';
  const prominentAccentColor =
    game.alertState === 'in_progress' ? '#e07820' : COLORS.accent;
  const finishedOutcome = getFinishedOutcome(game, currentUsername);

  let subtitle: string;
  if (game.status === 'waiting_for_players') {
    subtitle = 'Waiting for players...';
  } else if (game.status === 'finished') {
    subtitle = 'Finished';
  } else {
    subtitle = `Round ${game.roundNumber} · ${game.currentPlayerName}'s turn`;
  }

  const cardStyle = [
    styles.gameCard,
    isProminent && {
      borderLeftWidth: 4,
      borderLeftColor: prominentAccentColor,
    },
    !isProminent &&
      (game.alertState === 'waiting' || game.alertState === 'waiting_for_players') &&
      styles.gameCardMuted,
    !isTappable && styles.gameCardDisabled,
    isLoading && styles.gameCardLoading,
  ];

  const badge = (() => {
    switch (game.alertState) {
      case 'your_turn':
        return (
          <View style={styles.asyncAlertBadgeYourTurn}>
            <Text style={styles.asyncAlertBadgeYourTurnText}>YOUR TURN</Text>
          </View>
        );
      case 'in_progress':
        return (
          <View style={styles.asyncAlertBadgeInProgress}>
            <Text style={styles.asyncAlertBadgeInProgressText}>IN PROGRESS</Text>
          </View>
        );
      case 'waiting':
        return (
          <Text style={styles.asyncAlertBadgeWaitingText}>Waiting...</Text>
        );
      case 'waiting_for_players':
        return (
          <Text style={styles.asyncAlertBadgeWaitingText}>Waiting...</Text>
        );
      case 'finished':
        if (finishedOutcome === 'victory') {
          return (
            <View style={styles.asyncAlertBadgeVictory}>
              <Text style={styles.asyncAlertBadgeFinishedText}>VICTORY</Text>
            </View>
          );
        }
        if (finishedOutcome === 'defeat') {
          return (
            <View style={styles.asyncAlertBadgeDefeat}>
              <Text style={styles.asyncAlertBadgeFinishedText}>DEFEAT</Text>
            </View>
          );
        }
        return (
          <View style={styles.asyncAlertBadgeFinished}>
            <Text style={styles.asyncAlertBadgeFinishedMutedText}>FINISHED</Text>
          </View>
        );
      default:
        return null;
    }
  })();

  const deleteControl = canDelete ? (
    <Pressable
      style={({ pressed }) => [
        styles.asyncGameDeleteButton,
        pressed && styles.asyncGameDeleteButtonPressed,
      ]}
      onPress={(event) => {
        event.stopPropagation();
        onDelete();
      }}
      disabled={isDeleting || anyCardLoading}
      hitSlop={8}
    >
      {isDeleting ? (
        <ActivityIndicator size="small" color="#c0392b" />
      ) : (
        <Text style={styles.asyncGameDeleteButtonText}>Delete</Text>
      )}
    </Pressable>
  ) : null;

  const content = (
    <>
      <View style={styles.asyncGameCardHeader}>
        <Text style={[styles.gameCardName, styles.asyncGameCardTitle]}>{game.name}</Text>
        <View style={styles.asyncGameCardHeaderActions}>
          {badge}
          {deleteControl}
        </View>
      </View>
      <Text style={styles.gameCardPlayers}>{playerNames}</Text>
      <Text
        style={[
          styles.asyncGameSubtitle,
          game.status === 'waiting_for_players' && styles.asyncGameSubtitleMuted,
        ]}
      >
        {subtitle}
      </Text>
      {isLoading && (
        <ActivityIndicator style={styles.asyncGameCardLoader} color={COLORS.accent} />
      )}
    </>
  );

  if (!isTappable) {
    return <View style={cardStyle}>{content}</View>;
  }

  return (
    <Pressable
      style={({ pressed }) => [
        ...cardStyle,
        pressed && !isLoading && !isDeleting && styles.gameCardPressed,
      ]}
      onPress={onPress}
      disabled={isLoading || isDeleting || anyCardLoading}
    >
      {content}
    </Pressable>
  );
}

/** Local pass-and-play and solo campaigns — always tappable so the active player can resume. */
function GameCard({
  record,
  onPress,
  onDelete,
}: {
  record: GameRecord;
  onPress: () => void;
  onDelete?: () => void;
}) {
  const { state } = record;
  const humanPlayer = state.players.find((p) => !p.isAI);
  const humanId = humanPlayer?.id;
  const isHumanTurn =
    humanId !== undefined && state.currentPlayerId === humanId && state.status === 'active';
  const currentPlayer = state.players.find((p) => p.id === state.currentPlayerId);
  const playerNames = state.players.map((p) => p.name).join(' · ');

  let outcomeLabel: string | null = null;
  if (state.status === 'finished' && humanId !== undefined) {
    outcomeLabel = state.winnerId === humanId ? 'VICTORY' : 'DEFEAT';
  }

  const deleteControl =
    onDelete != null ? (
      <Pressable
        style={({ pressed }) => [
          styles.asyncGameDeleteButton,
          pressed && styles.asyncGameDeleteButtonPressed,
        ]}
        onPress={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        hitSlop={8}
      >
        <Text style={styles.asyncGameDeleteButtonText}>Delete</Text>
      </Pressable>
    ) : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.gameCard, pressed && styles.gameCardPressed]}
      onPress={onPress}
    >
      {onDelete != null ? (
        <View style={styles.asyncGameCardHeader}>
          <Text style={[styles.gameCardName, styles.asyncGameCardTitle]}>{record.name}</Text>
          <View style={styles.asyncGameCardHeaderActions}>{deleteControl}</View>
        </View>
      ) : (
        <Text style={styles.gameCardName}>{record.name}</Text>
      )}
      <Text style={styles.gameCardPlayers}>{playerNames}</Text>
      <View style={styles.gameCardFooter}>
        {state.status === 'active' && currentPlayer !== undefined && (
          <Text style={styles.gameCardTurn}>
            {currentPlayer.name}
            {isHumanTurn && <Text style={styles.yourTurnBadge}> · YOUR TURN</Text>}
          </Text>
        )}
        {outcomeLabel !== null && (
          <Text style={styles.gameCardOutcome}>{outcomeLabel}</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavigationProp>();
  const { currentUser } = useAuthStore();
  const games = useGameStore((s) => s.games);
  const _hasHydrated = useGameStore((s) => s._hasHydrated);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const loadGame = useGameStore((s) => s.loadGame);
  const loadAsyncGame = useGameStore((s) => s.loadAsyncGame);
  const deleteLocalGame = useGameStore((s) => s.deleteGame);

  const localGames = useMemo(
    () => games.filter((record) => record.asyncGameId == null),
    [games],
  );

  const soloGames = useMemo(
    () => localGames.filter(isSoloGame),
    [localGames],
  );

  const passAndPlayGames = useMemo(
    () => localGames.filter((record) => !isSoloGame(record)),
    [localGames],
  );

  const [isCreating, setIsCreating] = useState(false);
  const [gameName, setGameName] = useState(() =>
    getDefaultCampaignName(currentUser?.username),
  );
  const [playerSlots, setPlayerSlots] = useState<PlayerSlot[]>(() =>
    createDefaultPlayerSlots(currentUser?.username ?? 'Commander'),
  );
  const [playMode, setPlayMode] = useState<'passAndPlay' | 'asyncMultiplayer'>('passAndPlay');
  const [mapSize, setMapSize] = useState<MapSize>('medium');
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [invites, setInvites] = useState<ApiInvite[]>([]);
  const [inviteLoadingId, setInviteLoadingId] = useState<number | null>(null);
  const [asyncGames, setAsyncGames] = useState<ApiGame[]>([]);
  const [asyncGamesLoading, setAsyncGamesLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingGameId, setLoadingGameId] = useState<number | null>(null);
  const [deletingGameId, setDeletingGameId] = useState<number | null>(null);
  /** Games created this session when the list API omits creator fields. */
  const [sessionCreatedGameIds, setSessionCreatedGameIds] = useState<Set<number>>(
    () => new Set(),
  );
  const isFirstAsyncGamesLoad = useRef(true);
  const [friendPickerSlotIndex, setFriendPickerSlotIndex] = useState<number | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);

  const sortedAsyncGames = useMemo(
    () => sortAsyncGamesByAlertPriority(asyncGames),
    [asyncGames],
  );

  useEffect(() => {
    if (playMode !== 'asyncMultiplayer') {
      setFriendPickerSlotIndex(null);
      return;
    }

    void (async () => {
      try {
        const list = await getFriends();
        setFriends(list);
      } catch {
        setFriends([]);
      }
    })();
  }, [playMode]);

  const refreshAsyncGames = useCallback(async () => {
    const isFirstLoad = isFirstAsyncGamesLoad.current;
    if (isFirstLoad) {
      setAsyncGamesLoading(true);
    }

    try {
      const list = await listGames();
      const userId = useAuthStore.getState().currentUser?.id;
      setAsyncGames(
        list.map((game) =>
          sessionCreatedGameIds.has(game.id) && userId != null
            ? {
                ...game,
                createdByUserId: game.createdByUserId ?? userId,
                isCreator: game.isCreator ?? true,
              }
            : game,
        ),
      );
    } catch {
      if (isFirstLoad) {
        setAsyncGames([]);
      }
    } finally {
      if (isFirstLoad) {
        setAsyncGamesLoading(false);
        isFirstAsyncGamesLoad.current = false;
      }
    }
  }, [sessionCreatedGameIds]);

  const refreshOnFocus = useCallback(
    (options?: { showLoading?: boolean }) => {
      const showLoading = options?.showLoading ?? false;

      void (async () => {
        if (showLoading) {
          setIsRefreshing(true);
        }

        try {
          await refreshAsyncGames();

          const [requestsResult, invitesResult] = await Promise.all([
            getFriendRequests().catch(() => null),
            listInvites().catch(() => null),
          ]);

          if (requestsResult !== null) {
            setPendingRequestCount(requestsResult.length);
          }
          if (invitesResult !== null) {
            setInvites(invitesResult);
          }
        } finally {
          if (showLoading) {
            setIsRefreshing(false);
          }
        }
      })();
    },
    [refreshAsyncGames],
  );

  const handleManualRefresh = useCallback(() => {
    refreshOnFocus({ showLoading: true });
  }, [refreshOnFocus]);

  useFocusEffect(
    useCallback(() => {
      refreshOnFocus();

      const intervalId = setInterval(() => {
        refreshOnFocus();
      }, 60_000);

      const appStateSubscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
          refreshOnFocus();
        }
      });

      const unsubscribeHomeRefresh = subscribeHomeRefresh(refreshOnFocus);

      return () => {
        clearInterval(intervalId);
        appStateSubscription.remove();
        unsubscribeHomeRefresh();
      };
    }, [refreshOnFocus]),
  );

  const addPlayerSlot = () => {
    setPlayerSlots((prev) =>
      prev.length >= 8 ? prev : [...prev, { type: 'ai', difficulty: 'hard' }],
    );
  };

  const removeLastSlot = () => {
    setPlayerSlots((prev) => (prev.length <= 2 ? prev : prev.slice(0, -1)));
  };

  const setSlotType = (index: number, type: 'human' | 'ai') => {
    setPlayerSlots((prev) =>
      prev.map((slot, i) => {
        if (i !== index) return slot;
        if (type === 'human') {
          return { type: 'human', name: slot.name };
        }
        return { type: 'ai', difficulty: 'hard' };
      }),
    );
  };

  const setSlotName = (index: number, name: string) => {
    setPlayerSlots((prev) =>
      prev.map((slot, i) =>
        i === index && slot.type === 'human' ? { ...slot, name } : slot,
      ),
    );
  };

  const selectFriendForSlot = (index: number, friend: Friend) => {
    setPlayerSlots((prev) =>
      prev.map((slot, i) =>
        i === index && slot.type === 'human'
          ? { ...slot, name: friend.user.username, userId: friend.user.id }
          : slot,
      ),
    );
    setFriendPickerSlotIndex(null);
  };

  const clearSlotFriend = (index: number) => {
    setPlayerSlots((prev) =>
      prev.map((slot, i) =>
        i === index && slot.type === 'human'
          ? { ...slot, name: '', userId: undefined }
          : slot,
      ),
    );
  };

  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = () => {
    const { width, height, planetCount } = computeMapDimensions(mapSize, playerSlots.length);
    const playerName = (playerSlots[0]?.name ?? '').trim() || 'Commander';
    const campaignName = resolveCampaignName(gameName, playerName);

    if (playMode === 'passAndPlay') {
      startNewGame({
        playerName,
        gameName: campaignName,
        playerSlots,
        mapSize,
        mapWidth: width,
        mapHeight: height,
        planetCount,
        playMode,
      });
      navigation.navigate('Game', {});
      return;
    }

    const allOpponentsAreAI = playerSlots.slice(1).every((slot) => slot.type === 'ai');
    if (allOpponentsAreAI && playMode === 'asyncMultiplayer') {
      startNewGame({
        playerName,
        gameName: campaignName,
        playerSlots,
        mapSize,
        mapWidth: width,
        mapHeight: height,
        planetCount,
        playMode: 'passAndPlay',
      });
      navigation.navigate('Game', {});
      return;
    }

    // Async multiplayer — generate the initial state client-side and create on the backend.
    // The backend stores state_json directly so no engine script is required.
    const seed = Date.now();
    const config: GameConfig = {
      playerName,
      playerSlots,
      mapSize,
      mapWidth: width,
      mapHeight: height,
      planetCount,
      playMode: 'asyncMultiplayer',
    };
    const initialState = generateInitialGameState(config, seed);

    setIsLaunching(true);
    void (async () => {
      try {
        const response = await createGame({
          name: campaignName,
          playMode: 'async_multiplayer',
          mapConfig: { mapSize, mapWidth: width, mapHeight: height, planetCount, seed },
          playerSlots: playerSlots.map((slot) => ({
            type: slot.type,
            userId: slot.userId ?? null,
            name: (slot.name ?? '').trim() || (slot.type === 'ai' ? 'AI' : 'Player'),
            ...(slot.type === 'ai' ? { difficulty: 'hard' } : {}),
          })),
          stateJson: JSON.stringify(initialState),
        });
        setSessionCreatedGameIds((prev) => new Set(prev).add(response.game.id));
        loadAsyncGame({
          ...response.game,
          stateJson: response.stateJson,
          inProgressActions: null,
          latestEvents: [],
        });
        setIsLaunching(false);
        navigation.navigate('Game', {});
      } catch {
        setIsLaunching(false);
        showAlert('Error', 'Could not create game. Check your connection and try again.');
      }
    })();
  };

  const handleResume = (id: string) => {
    loadGame(id);
    navigation.navigate('Game', {});
  };

  const handleDeleteLocalGame = (record: GameRecord) => {
    showConfirm(
      'Delete Game',
      'Are you sure you want to delete this game? This cannot be undone.',
      () => deleteLocalGame(record.id),
    );
  };

  const handleOpenAsyncGame = (gameId: number) => {
    if (loadingGameId !== null) {
      return;
    }
    const summary = asyncGames.find((g) => g.id === gameId);
    if (
      summary !== undefined &&
      isAsyncMultiplayerApiGame(summary) &&
      !summary.isMyTurn
    ) {
      return;
    }
    setLoadingGameId(gameId);
    void (async () => {
      try {
        const detail = await getGame(gameId);
        if (isAsyncMultiplayerApiGame(detail) && !detail.isMyTurn) {
          setLoadingGameId(null);
          return;
        }
        loadAsyncGame(detail);
        setLoadingGameId(null);
        navigation.navigate('Game', {});
      } catch {
        setLoadingGameId(null);
        showAlert('Load Failed', 'Could not load game. Check your connection.');
      }
    })();
  };

  const handleAcceptInvite = (invite: ApiInvite) => {
    setInviteLoadingId(invite.id);
    void (async () => {
      try {
        const result = await acceptInvite(invite.id);
        setInvites((prev) => prev.filter((item) => item.id !== invite.id));
        if (result.gameStarted) {
          await refreshAsyncGames();
        }
      } catch {
        showAlert('Error', 'Could not accept invite.');
      } finally {
        setInviteLoadingId(null);
      }
    })();
  };

  const handleDeleteAsyncGame = (game: ApiGame) => {
    showConfirm(
      'Delete Game',
      `Permanently delete "${game.name}"? This cannot be undone.`,
      () => {
            setDeletingGameId(game.id);
            void (async () => {
              try {
                await deleteApiGame(game.id);
                setAsyncGames((prev) => prev.filter((item) => item.id !== game.id));
                setSessionCreatedGameIds((prev) => {
                  const next = new Set(prev);
                  next.delete(game.id);
                  return next;
                });
                const localRecord = games.find((record) => record.asyncGameId === game.id);
                if (localRecord) {
                  deleteLocalGame(localRecord.id);
                }
              } catch (err) {
                const message =
                  err instanceof ApiError
                    ? err.message
                    : 'Could not delete game. Check your connection.';
                showAlert('Delete Failed', message);
              } finally {
                setDeletingGameId(null);
              }
            })();
      },
    );
  };

  const handleDeclineInvite = (invite: ApiInvite) => {
    setInviteLoadingId(invite.id);
    void (async () => {
      try {
        await declineInvite(invite.id);
        setInvites((prev) => prev.filter((item) => item.id !== invite.id));
      } catch {
        showAlert('Error', 'Could not decline invite.');
      } finally {
        setInviteLoadingId(null);
      }
    })();
  };

  if (isCreating) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppTopBar
          pendingRequestCount={pendingRequestCount}
          onFriendsPress={() => navigation.navigate('Friends')}
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            onPress={() => setIsCreating(false)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>NEW CAMPAIGN</Text>
            <Text style={styles.title}>Launch{'\n'}Campaign</Text>
            <View style={styles.titleRule} />
            <Text style={styles.subtitle}>Configure your campaign before entering the galaxy.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Campaign name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Galaxy Conquest"
              placeholderTextColor={COLORS.textMuted}
              value={gameName}
              onChangeText={setGameName}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={100}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Players ({playerSlots.length})</Text>
            <View style={styles.slotList}>
              {playerSlots.map((slot, index) => (
                <View key={index} style={styles.slotRow}>
                  <View style={styles.slotHeader}>
                    <Text style={styles.slotNumber}>Slot {index + 1}</Text>
                    {index === 0 ? (
                      <Text style={styles.slotLabel}>You · Human</Text>
                    ) : (
                      <View style={styles.slotTypeToggle}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.slotTypeChip,
                            slot.type === 'human' && styles.slotTypeChipSelected,
                            pressed && slot.type !== 'human' && styles.slotTypeChipPressed,
                          ]}
                          onPress={() => setSlotType(index, 'human')}
                        >
                          <Text
                            style={[
                              styles.slotTypeChipText,
                              slot.type === 'human' && styles.slotTypeChipTextSelected,
                            ]}
                          >
                            Human
                          </Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.slotTypeChip,
                            slot.type === 'ai' && styles.slotTypeChipSelected,
                            pressed && slot.type !== 'ai' && styles.slotTypeChipPressed,
                          ]}
                          onPress={() => setSlotType(index, 'ai')}
                        >
                          <Text
                            style={[
                              styles.slotTypeChipText,
                              slot.type === 'ai' && styles.slotTypeChipTextSelected,
                            ]}
                          >
                            AI
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                  {slot.type === 'human' &&
                    (index === 0 || playMode === 'passAndPlay' ? (
                      <TextInput
                        style={styles.slotNameInput}
                        placeholder="Player name"
                        placeholderTextColor={COLORS.textMuted}
                        value={slot.name ?? ''}
                        onChangeText={(text) => setSlotName(index, text)}
                        autoCapitalize="words"
                        autoCorrect={false}
                        multiline={false}
                      />
                    ) : (
                      <View style={styles.friendPickerRow}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.friendPickerSelect,
                            pressed && styles.friendPickerSelectPressed,
                          ]}
                          onPress={() => setFriendPickerSlotIndex(index)}
                        >
                          <Text
                            style={
                              slot.name?.trim()
                                ? styles.friendPickerSelectedText
                                : styles.friendPickerPlaceholderText
                            }
                          >
                            {slot.name?.trim() || 'Select a friend'}
                          </Text>
                        </Pressable>
                        {slot.userId != null && (
                          <Pressable
                            style={({ pressed }) => [
                              styles.friendPickerClearButton,
                              pressed && styles.friendPickerClearButtonPressed,
                            ]}
                            onPress={() => clearSlotFriend(index)}
                            hitSlop={8}
                          >
                            <Text style={styles.friendPickerClearText}>✕</Text>
                          </Pressable>
                        )}
                      </View>
                    ))}
                </View>
              ))}
            </View>
            <View style={styles.slotActionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.addPlayerButton,
                  pressed && styles.addPlayerButtonPressed,
                  playerSlots.length >= 8 && styles.addPlayerButtonDisabled,
                ]}
                onPress={addPlayerSlot}
                disabled={playerSlots.length >= 8}
              >
                <Text
                  style={[
                    styles.addPlayerButtonText,
                    playerSlots.length >= 8 && styles.addPlayerButtonTextDisabled,
                  ]}
                >
                  Add Player
                </Text>
              </Pressable>
              {playerSlots.length > 2 && (
                <Pressable
                  style={({ pressed }) => [
                    styles.removePlayerButton,
                    pressed && styles.removePlayerButtonPressed,
                  ]}
                  onPress={removeLastSlot}
                >
                  <Text style={styles.removePlayerButtonText}>Remove</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Play mode</Text>
            <View style={styles.playModeRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.playModeCard,
                  playMode === 'passAndPlay' && styles.playModeCardSelected,
                  pressed && playMode !== 'passAndPlay' && styles.playModeCardPressed,
                ]}
                onPress={() => setPlayMode('passAndPlay')}
              >
                <Text
                  style={[
                    styles.playModeTitle,
                    playMode === 'passAndPlay' && styles.playModeTitleSelected,
                  ]}
                >
                  Pass & Play
                </Text>
                <Text
                  style={[
                    styles.playModeSubtitle,
                    playMode === 'passAndPlay' && styles.playModeSubtitleSelected,
                  ]}
                >
                  Share one device
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.playModeCard,
                  playMode === 'asyncMultiplayer' && styles.playModeCardSelected,
                  pressed && playMode !== 'asyncMultiplayer' && styles.playModeCardPressed,
                ]}
                onPress={() => setPlayMode('asyncMultiplayer')}
              >
                <Text
                  style={[
                    styles.playModeTitle,
                    playMode === 'asyncMultiplayer' && styles.playModeTitleSelected,
                  ]}
                >
                  Play with Friends
                </Text>
                <Text
                  style={[
                    styles.playModeSubtitle,
                    playMode === 'asyncMultiplayer' && styles.playModeSubtitleSelected,
                  ]}
                >
                  Separate devices
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Map size</Text>
            <View style={styles.mapSizeRow}>
              {(Object.keys(MAP_SIZE_CONFIG) as MapSize[]).map((size) => {
                const selected = mapSize === size;
                return (
                  <Pressable
                    key={size}
                    style={({ pressed }) => [
                      styles.mapSizeButton,
                      selected && styles.mapSizeButtonSelected,
                      pressed && !selected && styles.mapSizeButtonPressed,
                    ]}
                    onPress={() => setMapSize(size)}
                  >
                    <Text style={[styles.mapSizeLabel, selected && styles.mapSizeLabelSelected]}>
                      {MAP_SIZE_LABELS[size]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.launchButton, (pressed || isLaunching) && styles.launchButtonPressed]}
            onPress={isLaunching ? undefined : handleLaunch}
            disabled={isLaunching}
          >
            {isLaunching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.launchButtonText}>Launch Campaign</Text>
            )}
          </Pressable>
        </ScrollView>

        <Modal
          visible={friendPickerSlotIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setFriendPickerSlotIndex(null)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setFriendPickerSlotIndex(null)}
          >
            <Pressable style={styles.friendPickerModalCard} onPress={() => {}}>
              <View style={styles.friendPickerModalHeader}>
                <Text style={styles.friendPickerModalTitle}>Pick a Friend</Text>
                <Pressable
                  onPress={() => setFriendPickerSlotIndex(null)}
                  hitSlop={12}
                >
                  <Text style={styles.friendPickerModalClose}>✕</Text>
                </Pressable>
              </View>

              {friends.length === 0 ? (
                <View style={styles.friendPickerEmptyState}>
                  <Text style={styles.friendPickerEmptyText}>
                    No friends yet — add friends first
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.friendPickerGoButton,
                      pressed && styles.friendPickerGoButtonPressed,
                    ]}
                    onPress={() => {
                      setFriendPickerSlotIndex(null);
                      navigation.navigate('Friends');
                    }}
                  >
                    <Text style={styles.friendPickerGoButtonText}>Go to Friends</Text>
                  </Pressable>
                </View>
              ) : (
                <ScrollView
                  style={styles.friendPickerList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {friends.map((friend) => (
                    <Pressable
                      key={friend.friendshipId}
                      style={({ pressed }) => [
                        styles.friendPickerListRow,
                        pressed && styles.friendPickerListRowPressed,
                      ]}
                      onPress={() => {
                        if (friendPickerSlotIndex !== null) {
                          selectFriendForSlot(friendPickerSlotIndex, friend);
                        }
                      }}
                    >
                      <Text style={styles.friendPickerListRowText}>
                        {friend.user.username}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppTopBar
        pendingRequestCount={pendingRequestCount}
        onFriendsPress={() => navigation.navigate('Friends')}
        onRefreshPress={handleManualRefresh}
        isRefreshing={isRefreshing}
      />
      <View style={styles.lobbyContainer}>
        <ScrollView
          contentContainerStyle={styles.lobbyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>{APP_NAME_UPPER}</Text>
            <Text style={styles.title}>Command{'\n'}Center</Text>
            <View style={styles.titleRule} />
            <Text style={styles.subtitle}>Select a campaign or launch a new one.</Text>
          </View>

          {invites.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>Game Invites ({invites.length})</Text>
              <View style={styles.inviteList}>
                {invites.map((invite) => {
                  const isLoading = inviteLoadingId === invite.id;

                  return (
                    <View key={invite.id} style={styles.inviteCard}>
                      <Text style={styles.inviteGameName}>{invite.game.name}</Text>
                      <Text style={styles.inviteFromText}>
                        From: {invite.inviter.username}
                      </Text>
                      {isLoading ? (
                        <ActivityIndicator
                          style={styles.inviteLoadingIndicator}
                          color={COLORS.accent}
                        />
                      ) : (
                        <View style={styles.inviteActionsRow}>
                          <Pressable
                            style={({ pressed }) => [
                              styles.inviteAcceptButton,
                              pressed && styles.inviteAcceptButtonPressed,
                            ]}
                            onPress={() => handleAcceptInvite(invite)}
                          >
                            <Text style={styles.inviteAcceptButtonText}>Accept</Text>
                          </Pressable>
                          <Pressable
                            style={({ pressed }) => [
                              styles.inviteDeclineButton,
                              pressed && styles.inviteDeclineButtonPressed,
                            ]}
                            onPress={() => handleDeclineInvite(invite)}
                          >
                            <Text style={styles.inviteDeclineButtonText}>Decline</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {(asyncGamesLoading || asyncGames.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.label}>Play with Friends</Text>
              {asyncGamesLoading ? (
                <ActivityIndicator
                  style={styles.asyncGamesSectionLoader}
                  color={COLORS.accent}
                />
              ) : (
                <View style={styles.gameList}>
                  {sortedAsyncGames.map((game) => (
                    <AsyncGameCard
                      key={game.id}
                      game={game}
                      isLoading={loadingGameId === game.id}
                      anyCardLoading={loadingGameId !== null || deletingGameId !== null}
                      currentUsername={currentUser?.username}
                      canDelete={isCurrentUserGameCreator(
                        game,
                        currentUser?.id,
                        currentUser?.username,
                      )}
                      isDeleting={deletingGameId === game.id}
                      onPress={() => handleOpenAsyncGame(game.id)}
                      onDelete={() => handleDeleteAsyncGame(game)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {_hasHydrated && soloGames.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>Solos</Text>
              <View style={styles.gameList}>
                {soloGames.map((record) => (
                  <GameCard
                    key={record.id}
                    record={record}
                    onPress={() => handleResume(record.id)}
                    onDelete={() => handleDeleteLocalGame(record)}
                  />
                ))}
              </View>
            </View>
          )}

          {_hasHydrated && passAndPlayGames.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>Pass & Play</Text>
              <View style={styles.gameList}>
                {passAndPlayGames.map((record) => (
                  <GameCard
                    key={record.id}
                    record={record}
                    onPress={() => handleResume(record.id)}
                    onDelete={() => handleDeleteLocalGame(record)}
                  />
                ))}
              </View>
            </View>
          )}

          {_hasHydrated &&
          localGames.length === 0 &&
          asyncGames.length === 0 &&
          !asyncGamesLoading ? (
            <Text style={styles.emptyMessage}>No active campaigns.{'\n'}Start a new one below.</Text>
          ) : null}
        </ScrollView>

        <View style={styles.lobbyFooter}>
          <Pressable
            style={({ pressed }) => [styles.newCampaignButton, pressed && styles.launchButtonPressed]}
            onPress={() => {
              setGameName(getDefaultCampaignName(currentUser?.username));
              setIsCreating(true);
            }}
          >
            <Text style={styles.launchButtonText}>New Campaign</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  lobbyContainer: {
    flex: 1,
  },
  lobbyScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  lobbyFooter: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    marginTop: 16,
    marginBottom: 32,
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
  emptyMessage: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 48,
    letterSpacing: 0.5,
  },
  inviteList: {
    gap: 10,
  },
  inviteCard: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 16,
    gap: 10,
  },
  inviteGameName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  inviteFromText: {
    color: COLORS.textMuted,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  inviteActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  inviteAcceptButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  inviteAcceptButtonPressed: {
    opacity: 0.85,
  },
  inviteAcceptButtonText: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  inviteDeclineButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  inviteDeclineButtonPressed: {
    borderColor: COLORS.textMuted,
    opacity: 0.85,
  },
  inviteDeclineButtonText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  inviteLoadingIndicator: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  gameList: {
    gap: 12,
  },
  gameCard: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 16,
  },
  gameCardPressed: {
    borderColor: COLORS.accent,
  },
  gameCardDisabled: {
    opacity: 0.75,
  },
  gameCardMuted: {
    opacity: 0.9,
  },
  gameCardLoading: {
    opacity: 0.7,
  },
  asyncGameCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  asyncGameCardTitle: {
    flex: 1,
    marginBottom: 0,
  },
  asyncGameCardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  asyncGameDeleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e8b4b0',
    backgroundColor: '#fdf5f4',
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  asyncGameDeleteButtonPressed: {
    opacity: 0.85,
    borderColor: '#c0392b',
  },
  asyncGameDeleteButtonText: {
    color: '#c0392b',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  asyncAlertBadgeYourTurn: {
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  asyncAlertBadgeYourTurnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  asyncAlertBadgeInProgress: {
    backgroundColor: '#e07820',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  asyncAlertBadgeInProgressText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  asyncAlertBadgeWaitingText: {
    color: '#9a8a50',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    flexShrink: 0,
  },
  asyncAlertBadgeVictory: {
    backgroundColor: '#2e8a50',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  asyncAlertBadgeDefeat: {
    backgroundColor: '#c0392b',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  asyncAlertBadgeFinished: {
    backgroundColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  asyncAlertBadgeFinishedText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  asyncAlertBadgeFinishedMutedText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  asyncGameSubtitle: {
    color: COLORS.text,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  asyncGameSubtitleMuted: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  asyncGameCardLoader: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  asyncGamesSectionLoader: {
    marginVertical: 16,
    alignSelf: 'center',
  },
  gameCardName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  gameCardPlayers: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  gameCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  gameCardTurn: {
    color: COLORS.text,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  yourTurnBadge: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  gameCardOutcome: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
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
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPressed: {
    backgroundColor: COLORS.accentDim,
  },
  stepperSymbol: {
    color: COLORS.accent,
    fontSize: 24,
    lineHeight: 28,
  },
  stepperDisabled: {
    color: COLORS.border,
  },
  stepperValueBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepperValue: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 2,
  },
  stepperHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 2,
  },
  slotList: {
    gap: 10,
  },
  slotRow: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  slotNumber: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  slotLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  slotTypeToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  slotTypeChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  slotTypeChipSelected: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  slotTypeChipPressed: {
    borderColor: COLORS.textMuted,
  },
  slotTypeChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  slotTypeChipTextSelected: {
    color: COLORS.accent,
  },
  slotNameInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    letterSpacing: 0.3,
  },
  friendPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  friendPickerSelect: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  friendPickerSelectPressed: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentDim,
  },
  friendPickerSelectedText: {
    color: COLORS.text,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  friendPickerPlaceholderText: {
    color: COLORS.textMuted,
    fontSize: 14,
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  friendPickerClearButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendPickerClearButtonPressed: {
    borderColor: COLORS.textMuted,
    opacity: 0.8,
  },
  friendPickerClearText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  friendPickerModalCard: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  friendPickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  friendPickerModalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  friendPickerModalClose: {
    color: COLORS.textMuted,
    fontSize: 18,
    lineHeight: 20,
  },
  friendPickerEmptyState: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  friendPickerEmptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  friendPickerGoButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.accentDim,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  friendPickerGoButtonPressed: {
    opacity: 0.85,
  },
  friendPickerGoButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  friendPickerList: {
    maxHeight: 320,
  },
  friendPickerListRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    marginBottom: 8,
  },
  friendPickerListRowPressed: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentDim,
  },
  friendPickerListRowText: {
    color: COLORS.text,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  slotActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  addPlayerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
  },
  addPlayerButtonPressed: {
    backgroundColor: COLORS.accentDim,
  },
  addPlayerButtonDisabled: {
    borderColor: COLORS.border,
    opacity: 0.5,
  },
  addPlayerButtonText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  addPlayerButtonTextDisabled: {
    color: COLORS.border,
  },
  removePlayerButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  removePlayerButtonPressed: {
    borderColor: COLORS.textMuted,
  },
  removePlayerButtonText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  playModeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  playModeCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playModeCardSelected: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  playModeCardPressed: {
    borderColor: COLORS.textMuted,
  },
  playModeTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  playModeTitleSelected: {
    color: COLORS.accent,
  },
  playModeSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
    letterSpacing: 0.3,
  },
  playModeSubtitleSelected: {
    color: COLORS.text,
  },
  mapSizeRow: {
    gap: 10,
  },
  mapSizeButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapSizeButtonSelected: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  mapSizeButtonPressed: {
    borderColor: COLORS.textMuted,
  },
  mapSizeLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 1,
  },
  mapSizeLabelSelected: {
    color: COLORS.accent,
  },
  mapSizeDetail: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  mapSizeDetailSelected: {
    color: COLORS.text,
  },
  newCampaignButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  launchButton: {
    marginTop: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  launchButtonPressed: {
    opacity: 0.85,
  },
  launchButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
