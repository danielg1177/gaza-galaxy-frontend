import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '../services/apiClient';
import type { GameMessage } from '../services/gamesService';
import { reportMessage } from '../services/gamesService';
import { blockUser } from '../services/friendsService';
import { useGameStore } from '../store/gameStore';
import { showAlert, showConfirm } from '../utils/webAlert';
import { lockViewportZoom, preventInputZoomOnFocus, resetScrollOnBlur } from '../utils/viewportZoom';

interface ConversationModalProps {
  visible: boolean;
  onClose: () => void;
  gameId: number;
  gameName: string;
  myUserId: number;
}

const COLORS = {
  background: '#1c1c2e',
  bubbleMine: '#2a4a7f',
  bubbleOther: '#2e2e2e',
  text: '#ffffff',
  textMuted: '#8a8a9a',
  inputBackground: '#2e2e2e',
  inputBorder: '#3a3a4a',
  sendDisabled: '#4a4a5a',
  sendActive: '#4060c8',
  danger: '#c0392b',
  blockedBanner: '#2a2430',
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function formatMessageTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isToday) {
    return timeStr;
  }

  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${timeStr}`;
}

export const ConversationModal: React.FC<ConversationModalProps> = ({
  visible,
  onClose,
  gameId,
  gameName,
  myUserId,
}) => {
  const insets = useSafeAreaInsets();
  const activeGameMessages = useGameStore((s) => s.activeGameMessages);
  const isFetchingMessages = useGameStore((s) => s.isFetchingMessages);
  const isSendingMessage = useGameStore((s) => s.isSendingMessage);
  const canSendGameMessages = useGameStore((s) => s.canSendGameMessages);
  const cannotSendGameMessagesReason = useGameStore((s) => s.cannotSendGameMessagesReason);
  const fetchMessages = useGameStore((s) => s.fetchMessages);
  const sendMessage = useGameStore((s) => s.sendMessage);
  const clearMessages = useGameStore((s) => s.clearMessages);

  const [inputText, setInputText] = useState('');
  const [actionMessage, setActionMessage] = useState<GameMessage | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const listRef = useRef<FlatList<GameMessage>>(null);
  const prevVisibleRef = useRef(visible);
  const initialLoadDoneRef = useRef(false);

  const handleClose = useCallback(() => {
    clearMessages();
    setInputText('');
    onClose();
  }, [clearMessages, onClose]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    return lockViewportZoom();
  }, [visible]);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      void fetchMessages(gameId).then(() => {
        initialLoadDoneRef.current = true;
      });
    }
    if (!visible) {
      initialLoadDoneRef.current = false;
    }
    prevVisibleRef.current = visible;
  }, [visible, gameId, fetchMessages]);

  useEffect(() => {
    if (!visible) return;
    const intervalId = setInterval(() => {
      void fetchMessages(gameId);
    }, 5000);
    return () => clearInterval(intervalId);
  }, [visible, gameId, fetchMessages]);

  const scrollToEnd = useCallback((animated = true) => {
    listRef.current?.scrollToEnd({ animated });
  }, []);

  useEffect(() => {
    if (visible && !isFetchingMessages && activeGameMessages.length > 0) {
      scrollToEnd(false);
    }
  }, [visible, isFetchingMessages, activeGameMessages.length, scrollToEnd]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSendingMessage || !canSendGameMessages) {
      return;
    }

    try {
      await sendMessage(gameId, trimmed);
      setInputText('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && !err.errors) {
        return;
      }
      showAlert(
        'Failed to send',
        err instanceof Error ? err.message : 'Something went wrong',
      );
    }
  };

  const handleReport = (message: GameMessage) => {
    showConfirm(
      'Report this message?',
      'We will review it and can hide the message or remove the account.',
      () => {
        void (async () => {
          setActionBusy(true);
          try {
            await reportMessage(gameId, message.id);
            setActionMessage(null);
            showAlert('Reported', 'Thanks. We will review this.');
          } catch (err) {
            showAlert(
              'Report failed',
              err instanceof Error ? err.message : 'Could not send the report.',
            );
          } finally {
            setActionBusy(false);
          }
        })();
      },
    );
  };

  const handleBlockSender = (message: GameMessage) => {
    if (message.senderUserId == null) {
      return;
    }
    showConfirm(
      `Block ${message.senderName}?`,
      'They will not be able to message you. Shared campaigns continue.',
      () => {
        void (async () => {
          setActionBusy(true);
          try {
            await blockUser(message.senderUserId as number);
            setActionMessage(null);
            await fetchMessages(gameId);
          } catch (err) {
            showAlert(
              'Block failed',
              err instanceof Error ? err.message : 'Could not block this player.',
            );
          } finally {
            setActionBusy(false);
          }
        })();
      },
    );
  };

  const renderMessage = ({ item }: { item: GameMessage }) => {
    const isMine = item.senderUserId === myUserId;

    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.messageRowMine : styles.messageRowOther,
        ]}
      >
        <View style={styles.messageContent}>
          {!isMine && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          <TouchableOpacity
            activeOpacity={isMine ? 1 : 0.85}
            onLongPress={isMine ? undefined : () => setActionMessage(item)}
            disabled={isMine}
          >
            <View
              style={[
                styles.bubble,
                isMine ? styles.bubbleMine : styles.bubbleOther,
              ]}
            >
              <Text style={styles.messageText}>{item.content}</Text>
            </View>
          </TouchableOpacity>
          <View
            style={[
              styles.metaRow,
              isMine ? styles.timestampMine : styles.timestampOther,
            ]}
          >
            <Text style={styles.timestamp}>
              {formatMessageTime(item.createdAt)}
            </Text>
            {!isMine && (
              <TouchableOpacity
                onPress={() => setActionMessage(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Message actions"
              >
                <Text style={styles.messageMenu}>···</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const canSend =
    canSendGameMessages && inputText.trim().length > 0 && !isSendingMessage;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {gameName}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Close chat"
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.messageArea}>
              {isFetchingMessages && !initialLoadDoneRef.current ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.sendActive} />
                </View>
              ) : (
                <FlatList
                  ref={listRef}
                  data={activeGameMessages}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderMessage}
                  contentContainerStyle={styles.messageList}
                  onContentSizeChange={() => scrollToEnd()}
                  keyboardShouldPersistTaps="handled"
                />
              )}
            </View>

            {canSendGameMessages ? (
              <View style={[styles.sendBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && styles.inputWeb]}
                  placeholder="Message..."
                  placeholderTextColor={COLORS.textMuted}
                  value={inputText}
                  onChangeText={setInputText}
                  maxLength={500}
                  multiline
                  numberOfLines={4}
                  editable={!isSendingMessage}
                  onFocus={Platform.OS === 'web' ? preventInputZoomOnFocus : undefined}
                  onBlur={Platform.OS === 'web' ? resetScrollOnBlur : undefined}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    canSend ? styles.sendButtonActive : styles.sendButtonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={!canSend}
                >
                  {isSendingMessage ? (
                    <ActivityIndicator size="small" color={COLORS.text} />
                  ) : (
                    <Text style={styles.sendButtonText}>➤</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.blockedBanner,
                  { paddingBottom: Math.max(insets.bottom, 16) },
                ]}
              >
                <Text style={styles.blockedBannerText}>
                  {cannotSendGameMessagesReason ??
                    'You cannot send messages in this game. Communication with the other player is blocked.'}
                </Text>
              </View>
            )}
            {actionMessage !== null && (
              <View style={styles.actionSheet}>
                <Text style={styles.actionSheetTitle} numberOfLines={2}>
                  {actionMessage.senderName}
                </Text>
                <TouchableOpacity
                  style={styles.actionSheetButton}
                  onPress={() => handleReport(actionMessage)}
                  disabled={actionBusy}
                >
                  <Text style={styles.actionSheetButtonText}>Report message</Text>
                </TouchableOpacity>
                {actionMessage.senderUserId != null && (
                  <TouchableOpacity
                    style={styles.actionSheetButton}
                    onPress={() => handleBlockSender(actionMessage)}
                    disabled={actionBusy}
                  >
                    <Text style={styles.actionSheetDangerText}>Block player</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionSheetButton}
                  onPress={() => setActionMessage(null)}
                  disabled={actionBusy}
                >
                  <Text style={styles.actionSheetMutedText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.inputBorder,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 12,
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 22,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  messageArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  messageRow: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  messageRowMine: {
    alignSelf: 'flex-end',
  },
  messageRowOther: {
    alignSelf: 'flex-start',
  },
  messageContent: {
    flexShrink: 1,
  },
  senderName: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: COLORS.bubbleMine,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.bubbleOther,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  messageMenu: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timestampMine: {
    textAlign: 'right',
    marginRight: 4,
  },
  timestampOther: {
    textAlign: 'left',
    marginLeft: 4,
  },
  sendBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.inputBorder,
    backgroundColor: COLORS.background,
  },
  blockedBanner: {
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.inputBorder,
    backgroundColor: COLORS.blockedBanner,
  },
  blockedBannerText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.text,
    maxHeight: 96,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    marginRight: 8,
  },
  inputWeb: {
    // Web-only: suppress focus ring; fontSize 16+ avoids iOS Safari input zoom.
    outlineWidth: 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: COLORS.sendActive,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.sendDisabled,
  },
  sendButtonText: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: '600',
  },
  actionSheet: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.inputBorder,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    gap: 4,
  },
  actionSheetTitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  actionSheetButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  actionSheetButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  actionSheetDangerText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  actionSheetMutedText: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
});
