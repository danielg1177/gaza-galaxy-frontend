import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

interface EditGameNameModalProps {
  visible: boolean;
  gameName: string;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>;
  isLoading?: boolean;
}

const COLORS = {
  background: '#f5f0eb',
  text: '#1c1c2e',
  textMuted: '#6a6880',
  accent: '#4060c8',
  accentDim: '#e2e8f8',
  panel: '#faf7f4',
  border: '#ccc4b8',
  error: '#d32f2f',
};

export const EditGameNameModal: React.FC<EditGameNameModalProps> = ({
  visible,
  gameName,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [inputValue, setInputValue] = useState(gameName);
  const [error, setError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    setInputValue(gameName);
    setError(null);
  }, [gameName, visible]);

  const handleSave = async () => {
    const trimmedValue = inputValue.trim();

    if (!trimmedValue) {
      setError('Game name cannot be empty');
      return;
    }

    if (trimmedValue.length > 100) {
      setError('Game name must be 100 characters or less');
      return;
    }

    if (trimmedValue === gameName) {
      onClose();
      return;
    }

    try {
      setLocalLoading(true);
      setError(null);
      await onSave(trimmedValue);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update game name',
      );
    } finally {
      setLocalLoading(false);
    }
  };

  const isDisabled = isLoading || localLoading || !inputValue.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Edit Game Name</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter game name"
            placeholderTextColor={COLORS.textMuted}
            value={inputValue}
            onChangeText={(text) => {
              setInputValue(text);
              setError(null);
            }}
            maxLength={100}
            editable={!isLoading && !localLoading}
          />

          <Text style={styles.charCount}>
            {inputValue.length}/100
          </Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading || localLoading}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                isDisabled && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={isDisabled}
            >
              {localLoading || isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
