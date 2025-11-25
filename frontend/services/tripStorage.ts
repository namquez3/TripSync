import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedTrip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  cost: number;
  duration: number;
  accommodation: string;
  description: string;
  matchPercentage: number;
  imageUrl?: string;
  itinerary?: string[];
  costBreakdown?: {
    flightUSD?: number;
    hotelPerNightUSD?: number;
    hotelNights?: number;
    hotelTotalUSD?: number;
    transportUSD?: number;
    activitiesUSD?: number;
    taxesFeesUSD?: number;
    totalUSD?: number;
    perPersonUSD?: number;
  };
  createdAt: string;
}

const TRIPS_STORAGE_KEY = '@tripsync_saved_trips';

export async function saveTrip(trip: Omit<SavedTrip, 'id' | 'createdAt'>): Promise<SavedTrip> {
  try {
    const trips = await getTrips();
    const newTrip: SavedTrip = {
      ...trip,
      id: `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    trips.push(newTrip);
    await AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
    return newTrip;
  } catch (error) {
    console.error('Error saving trip:', error);
    throw error;
  }
}

export async function getTrips(): Promise<SavedTrip[]> {
  try {
    const data = await AsyncStorage.getItem(TRIPS_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting trips:', error);
    return [];
  }
}

export async function getTripById(id: string): Promise<SavedTrip | null> {
  try {
    const trips = await getTrips();
    return trips.find(trip => trip.id === id) || null;
  } catch (error) {
    console.error('Error getting trip by id:', error);
    return null;
  }
}

export async function deleteTrip(id: string): Promise<void> {
  try {
    const trips = await getTrips();
    const filtered = trips.filter(trip => trip.id !== id);
    await AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting trip:', error);
    throw error;
  }
}

