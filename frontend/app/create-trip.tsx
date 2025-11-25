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

// Helper function to format date input as MM/DD/YYYY
const formatDateInput = (text: string): string => {
  // Remove all non-numeric characters
  const numbers = text.replace(/\D/g, '');
  
  // Limit to 8 digits (MMDDYYYY)
  const limited = numbers.slice(0, 8);
  
  // Format based on length
  if (limited.length === 0) return '';
  if (limited.length <= 2) return limited;
  if (limited.length <= 4) return `${limited.slice(0, 2)}/${limited.slice(2)}`;
  return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
};

// Helper function to validate date format (MM/DD/YYYY)
const isValidDate = (dateString: string): boolean => {
  if (!dateString || dateString.length !== 10) return false;
  
  const parts = dateString.split('/');
  if (parts.length !== 3) return false;
  
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  // Basic validation
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  // Check if date is valid (e.g., not Feb 30)
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

// Helper function to parse date string (MM/DD/YYYY) to Date object
const parseDate = (dateString: string): Date | null => {
  if (!isValidDate(dateString)) return null;
  const parts = dateString.split('/');
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  return new Date(year, month - 1, day);
};

// Helper function to check if date is in the past
const isDateInPast = (dateString: string): boolean => {
  const date = parseDate(dateString);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
};

// Helper function to check if end date is before start date
const isEndDateBeforeStart = (startDateString: string, endDateString: string): boolean => {
  const startDate = parseDate(startDateString);
  const endDate = parseDate(endDateString);
  if (!startDate || !endDate) return false;
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return endDate < startDate;
};

export default function CreateTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [departureLocation, setDepartureLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [friends, setFriends] = useState<string[]>([]);
  const [friendEmail, setFriendEmail] = useState('');
  const [startDateError, setStartDateError] = useState<string>('');
  const [endDateError, setEndDateError] = useState<string>('');

  const handleStartDateChange = (text: string) => {
    const formatted = formatDateInput(text);
    setStartDate(formatted);
    setStartDateError(''); // Clear error when user types
    
    // Validate if date is complete
    if (formatted.length === 10) {
      if (!isValidDate(formatted)) {
        setStartDateError('Please enter a valid date');
      } else if (isDateInPast(formatted)) {
        setStartDateError('Start date cannot be in the past');
      } else {
        setStartDateError('');
        // Check if end date is now invalid
        if (endDate && isValidDate(endDate) && isEndDateBeforeStart(formatted, endDate)) {
          setEndDateError('End date must be after start date');
        } else if (endDateError === 'End date must be after start date') {
          setEndDateError('');
        }
      }
    }
  };

  const handleEndDateChange = (text: string) => {
    const formatted = formatDateInput(text);
    setEndDate(formatted);
    setEndDateError(''); // Clear error when user types
    
    // Validate if date is complete
    if (formatted.length === 10) {
      if (!isValidDate(formatted)) {
        setEndDateError('Please enter a valid date');
      } else if (isDateInPast(formatted)) {
        setEndDateError('End date cannot be in the past');
      } else if (startDate && isValidDate(startDate) && isEndDateBeforeStart(startDate, formatted)) {
        setEndDateError('End date must be after start date');
      } else {
        setEndDateError('');
      }
    }
  };

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
    router.push({
      pathname: '/set-priorities',
      params: {
        departureLocation: departureLocation,
        destination: destination,
        startDate: startDate,
        endDate: endDate,
      },
    });
  };

  const isFormValid = 
    destination.trim() !== '' && 
    isValidDate(startDate) && 
    isValidDate(endDate) &&
    !isDateInPast(startDate) &&
    !isDateInPast(endDate) &&
    !isEndDateBeforeStart(startDate, endDate) &&
    startDateError === '' &&
    endDateError === '';

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

          {/* Departure Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Departure Location</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="flight-takeoff"
                size={20}
                color="#1C4E80"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Where are you departing from?"
                placeholderTextColor="#9CA3AF"
                value={departureLocation}
                onChangeText={setDepartureLocation}
              />
            </View>
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
              <View style={styles.dateInputWrapper}>
                <View style={[
                  styles.inputContainer, 
                  styles.dateInput,
                  startDateError ? styles.inputError : null
                ]}>
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={startDateError ? "#EF4444" : "#1C4E80"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor="#9CA3AF"
                    value={startDate}
                    onChangeText={handleStartDateChange}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
                {startDateError ? (
                  <Text style={styles.errorText}>{startDateError}</Text>
                ) : null}
              </View>
              <View style={styles.dateSeparator} />
              <View style={styles.dateInputWrapper}>
                <View style={[
                  styles.inputContainer, 
                  styles.dateInput,
                  endDateError ? styles.inputError : null
                ]}>
                  <MaterialIcons
                    name="event"
                    size={20}
                    color={endDateError ? "#EF4444" : "#1C4E80"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor="#9CA3AF"
                    value={endDate}
                    onChangeText={handleEndDateChange}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
                {endDateError ? (
                  <Text style={styles.errorText}>{endDateError}</Text>
                ) : null}
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
              !isFormValid && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!isFormValid}
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
    alignItems: 'flex-start',
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateInput: {
    flex: 1,
  },
  dateSeparator: {
    width: 12,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
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

