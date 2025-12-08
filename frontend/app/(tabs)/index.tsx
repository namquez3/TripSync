import { getTrips, SavedTrip } from '@/services/tripStorage';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Header() {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerTopRow}>
        <Text style={styles.appTitle}>TripSync</Text>
        <View style={styles.avatar} />
      </View>
      <Text style={styles.headerSubtitle}>Plan your next adventure together</Text>
    </View>
  );
}

type TripCardProps = { 
  trip: SavedTrip;
  onPress: () => void;
};

function TripCard({ trip, onPress }: TripCardProps) {
  const getImageUrl = () => {
    if (trip.imageUrl) {
      return trip.imageUrl;
    }
    const hashInput = trip.destination;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      hash = ((hash << 5) - hash) + hashInput.charCodeAt(i);
      hash = hash & hash;
    }
    const seed = Math.abs(hash);
    return `https://picsum.photos/seed/${seed}/800/400`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      // Handle MM/DD/YYYY format
      if (dateStr.includes('/')) {
        const [month, day, year] = dateStr.split('/');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (isNaN(date.getTime())) {
          return dateStr; // Return original if invalid
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      // Handle ISO format or other formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr; // Return original if invalid
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const dateRange = trip.startDate && trip.endDate 
    ? `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`
    : trip.startDate || 'Date TBD';

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Image source={{ uri: getImageUrl() }} style={styles.cardImage} contentFit="cover" />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{trip.destination}</Text>
        <Text style={styles.cardDate}>{dateRange}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTrips = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedTrips = await getTrips();
      // Sort by creation date, newest first
      savedTrips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTrips(savedTrips);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load trips when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [loadTrips])
  );

  const handleTripPress = (trip: SavedTrip) => {
    router.push({
      pathname: '/trip-detail',
      params: { tripId: trip.id },
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header />

        <Text style={styles.sectionTitle}>Your Trips</Text>

        {isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading trips...</Text>
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No trips yet</Text>
            <Text style={styles.emptyStateSubtext}>Create your first trip to get started!</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tripsRow}
          >
            {trips.map((trip, index) => (
              <React.Fragment key={trip.id}>
                {index > 0 && <View style={{ width: 16 }} />}
                <TripCard
                  trip={trip}
                  onPress={() => handleTripPress(trip)}
                />
              </React.Fragment>
            ))}
          </ScrollView>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.ctaContainer}>
        <Pressable style={styles.ctaButton} onPress={() => router.push('/create-trip')}>
          <Text style={styles.ctaPlus}>＋</Text>
          <Text style={styles.ctaLabel}>Start New Trip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  content: {
    paddingBottom: 0,
  },
  headerContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 20,
    backgroundColor: '#4F8BFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitle: {
    color: 'white',
    fontSize: 36,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  sectionTitle: {
    marginTop: 20,
    marginHorizontal: 16,
    fontSize: 28,
    fontWeight: '800',
    color: '#1E1E1E',
  },
  tripsRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    width: 360,
    borderRadius: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E1E1E',
  },
  cardDate: {
    marginTop: 6,
    color: '#6C6C6C',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6C6C6C',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  ctaContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  ctaButton: {
    backgroundColor: '#4F8BFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ctaPlus: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  ctaLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
});
