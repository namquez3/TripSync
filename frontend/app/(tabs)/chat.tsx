import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { chatAPI } from '@/services/api';

export default function ChatScreen() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setLoading(true);
    setResponse('');

    try {
      const result = await chatAPI.sendMessage(message);
      
      if (result.success) {
        setResponse(result.response);
      } else {
        Alert.alert('Error', result.error || 'Failed to get response');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Make sure the backend server is running.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">ChatGPT Integration</ThemedText>
        <ThemedText style={styles.subtitle}>
          Ask anything and get AI-powered responses
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.chatContainer}>
        {response ? (
          <ThemedView style={styles.responseContainer}>
            <ThemedText type="subtitle" style={styles.responseLabel}>
              Response:
            </ThemedText>
            <ThemedText style={styles.responseText}>{response}</ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.placeholderContainer}>
            <ThemedText style={styles.placeholderText}>
              Your conversation will appear here...
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      <ThemedView style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor="#999"
          value={message}
          onChangeText={setMessage}
          multiline
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.sendButtonText}>Send</ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 60 : 20,
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
  },
  chatContainer: {
    flex: 1,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  responseContainer: {
    flex: 1,
  },
  responseLabel: {
    marginBottom: 12,
  },
  responseText: {
    lineHeight: 24,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    opacity: 0.5,
    textAlign: 'center',
  },
  inputContainer: {
    gap: 12,
  },
  input: {
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    maxHeight: 150,
    fontSize: 16,
    color: '#000',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

