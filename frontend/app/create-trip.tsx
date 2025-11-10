import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [friends, setFriends] = useState<string[]>([]);
  const [friendEmail, setFriendEmail] = useState('');

  const addFriend = () => {
    if (friendEmail.trim() && !friends.includes(friendEmail.trim())) {
      setFriends([...friends, friendEmail.trim()]);
      setFriendEmail('');
    }
  };

  const removeFriend = (email: string) => {
    setFriends(friends.filter((f) => f !== email));
  };

  const handleContinue = () => {
    // TODO: Navigate to next step or save trip
    console.log({ destination, startDate, endDate, friends });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#1C4E80" />
            </Pressable>
            <Text style={styles.headerTitle}>Create New Trip</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Destination Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Destination</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="place"
                size={20}
                color="#1C4E80"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Where are you going?"
                placeholderTextColor="#9CA3AF"
                value={destination}
                onChangeText={setDestination}
              />
            </View>
          </View>

          {/* Dates Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Travel Dates</Text>
            <View style={styles.dateRow}>
              <View style={[styles.inputContainer, styles.dateInput]}>
                <MaterialIcons
                  name="calendar-today"
                  size={20}
                  color="#1C4E80"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Start date"
                  placeholderTextColor="#9CA3AF"
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>
              <View style={styles.dateSeparator} />
              <View style={[styles.inputContainer, styles.dateInput]}>
                <MaterialIcons
                  name="event"
                  size={20}
                  color="#1C4E80"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="End date"
                  placeholderTextColor="#9CA3AF"
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>
            </View>
          </View>

          {/* Invite Friends Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Invite Friends</Text>
            <Text style={styles.sectionDescription}>
              Add friends by email to collaborate on this trip
            </Text>

            {/* Add Friend Input */}
            <View style={styles.addFriendContainer}>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="person-add"
                  size={20}
                  color="#1C4E80"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  placeholderTextColor="#9CA3AF"
                  value={friendEmail}
                  onChangeText={setFriendEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onSubmitEditing={addFriend}
                />
              </View>
              <Pressable
                style={[
                  styles.addButton,
                  !friendEmail.trim() && styles.addButtonDisabled,
                ]}
                onPress={addFriend}
                disabled={!friendEmail.trim()}
              >
                <MaterialIcons name="add" size={24} color="white" />
              </Pressable>
            </View>

            {/* Friends List */}
            {friends.length > 0 && (
              <View style={styles.friendsList}>
                {friends.map((email, index) => (
                  <View key={index} style={styles.friendItem}>
                    <View style={styles.friendAvatar}>
                      <MaterialIcons name="person" size={16} color="#1C4E80" />
                    </View>
                    <Text style={styles.friendEmail}>{email}</Text>
                    <Pressable
                      onPress={() => removeFriend(email)}
                      style={styles.removeButton}
                    >
                      <MaterialIcons name="close" size={18} color="#FF7A70" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Spacer for button */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Continue Button */}
        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={[
              styles.continueButton,
              (!destination.trim() || !startDate.trim() || !endDate.trim()) &&
                styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!destination.trim() || !startDate.trim() || !endDate.trim()}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <MaterialIcons name="arrow-forward" size={20} color="white" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  screen: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1E1E1E',
  },
  headerSpacer: {
    width: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E1E1E',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6C6C6C',
    marginBottom: 16,
    fontWeight: '400',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E1E1E',
    fontWeight: '400',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
  },
  dateSeparator: {
    width: 12,
  },
  addFriendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    backgroundColor: '#1C4E80',
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1C4E80',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  addButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  friendsList: {
    marginTop: 16,
    gap: 12,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3C7A5',
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 16,
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  friendEmail: {
    flex: 1,
    fontSize: 15,
    color: '#1E1E1E',
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#F6F8FC',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  continueButton: {
    backgroundColor: '#1C4E80',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1C4E80',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
});

