import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TripRecommendation {
  id: string;
  destination: string;
  cost: number;
  duration: number; // in hours
  accommodation: string;
  matchPercentage: number;
  image: any;
  description: string;
  isGroupMatch: boolean;
  imageUrl?: string; // Store the actual image URL used
  itinerary?: string[]; // 👈 simplified
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
}

// Helper function to extract key words from activity text
function extractActivityKeywords(activity: string): string {
  // Remove common verbs and articles
  let cleaned = activity
    .replace(/\b(visit|explore|see|go to|check out|walk|stroll|enjoy|experience|discover|tour|the|a|an)\b/gi, '')
    .trim();
  
  // Extract key nouns/phrases (first 2-3 words usually contain the main subject)
  const words = cleaned.split(/\s+/).filter(w => w.length > 2);
  
  // Take the most important words (usually the first few)
  // This helps get more specific images (e.g., "Central Park" instead of "visit Central Park")
  if (words.length > 0) {
    // Take up to 3 key words
    return words.slice(0, 3).join(' ');
  }
  
  return cleaned;
}

// Get API base URL (handles Android emulator vs iOS simulator)
const getApiBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000'; // Android emulator special IP
  }
  return 'http://localhost:3000'; // iOS simulator and web
};

// Helper function to fetch image URL from backend API
async function getActivityImageUrl(activity: string, tripId: string, destination: string): Promise<string> {
  // Always return a fallback URL (Picsum Photos) as minimum
  const hashInput = `${destination}-${activity || ''}-${tripId}`;
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    hash = ((hash << 5) - hash) + hashInput.charCodeAt(i);
    hash = hash & hash;
  }
  const seed = Math.abs(hash);
  const fallbackUrl = `https://picsum.photos/seed/${seed}/800/400`;
  
  try {
    // Clean the destination name
    let cleanDestination = destination
      .replace(/\b(United States|USA|US|city|town|state|county)\b/gi, '')
      .trim()
      .replace(/,\s*\w+$/, '')
      .trim();
    
    if (!cleanDestination) {
      cleanDestination = destination;
    }
    
    // Extract key activity keywords
    const activityKeywords = activity ? extractActivityKeywords(activity) : '';
    
    // Call backend API to get image URL (uses Unsplash if API key is set)
    const apiBaseUrl = getApiBaseUrl();
    const apiUrl = `${apiBaseUrl}/api/get-image-url?destination=${encodeURIComponent(cleanDestination)}${activityKeywords ? `&activity=${encodeURIComponent(activityKeywords)}` : ''}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.length > 0) {
        return data.imageUrl;
      }
    }
  } catch (error) {
    // Silently fail - we'll use fallback
  }
  
  // Always return fallback
  return fallbackUrl;
}



function RecommendationCard({ trip, onSelect, onImageUrlChange }: { trip: TripRecommendation; onSelect: () => void; onImageUrlChange?: (url: string) => void }) {
    const [expanded, setExpanded] = useState(false);
    const hasItinerary = Array.isArray(trip.itinerary) && trip.itinerary.length > 0;
  
    const visibleItems = hasItinerary
      ? (expanded ? trip.itinerary! : trip.itinerary!.slice(0, 3))
      : [];

    // Generate fallback URL helper - always returns a valid URL
    const generateFallbackUrl = (dest: string, act: string, id: string) => {
      const hashInput = `${dest}-${act || ''}-${id}`;
      let hash = 0;
      for (let i = 0; i < hashInput.length; i++) {
        hash = ((hash << 5) - hash) + hashInput.charCodeAt(i);
        hash = hash & hash;
      }
      const seed = Math.abs(hash);
      return `https://picsum.photos/seed/${seed}/800/400`;
    };
    
    // Get activity for image
    const activity = hasItinerary && trip.itinerary && trip.itinerary.length > 0 
      ? trip.itinerary[0] 
      : '';
    
    // Always initialize with a valid fallback URL
    const initialUrl = generateFallbackUrl(trip.destination, activity, trip.id);
    const [imageUrl, setImageUrl] = useState<string>(initialUrl);

    // Fetch better image from API if available (non-blocking)
    useEffect(() => {
      let isMounted = true;
      
      const fetchImage = async () => {
        try {
          const url = await getActivityImageUrl(activity, trip.id, trip.destination);
          if (isMounted && url && url.length > 0) {
            setImageUrl(url);
            // Notify parent component of the image URL
            onImageUrlChange?.(url);
          }
        } catch (error) {
          // Silently fail - we already have a fallback
        }
      };
      
      // Also notify of initial fallback URL
      onImageUrlChange?.(initialUrl);
      
      // Don't block on this - we already have a fallback
      fetchImage();
      
      return () => {
        isMounted = false;
      };
    }, [trip.id, trip.destination, activity]);
    
    return (
      <View style={styles.recommendationCard}>
        {/* Tapping the image opens the detail view */}
        <Pressable onPress={onSelect} style={styles.imageContainer}>
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.tripImage} 
            resizeMode="cover"
            onError={() => {
              // If image fails, try a different fallback
              const altUrl = generateFallbackUrl(trip.destination, `alt-${trip.id}`, trip.id);
              setImageUrl(altUrl);
            }}
          />
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>{trip.matchPercentage}% Match</Text>
          </View>
        </Pressable>
  
        <View style={styles.cardContent}>
          {/* Tapping the title also opens detail */}
          <Pressable onPress={onSelect}>
            <Text style={styles.destinationName}>{trip.destination}</Text>
          </Pressable>

          {/* Price Display */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Estimated Price</Text>
            <Text style={styles.priceAmount}>${trip.cost.toLocaleString()}</Text>
          </View>
  
          {hasItinerary && (
            <View style={styles.itineraryPreview}>
              <Text style={styles.itineraryPreviewLabel}>Things to do</Text>
  
              {visibleItems.map((item, idx) => (
                <Text key={idx} style={styles.itineraryPreviewText}>
                  • {item}
                </Text>
              ))}
  
              {/* Only show the button if there's more than 3 items */}
              {trip.itinerary!.length > 3 && (
                <Pressable onPress={() => setExpanded(prev => !prev)}>
                  <Text style={styles.itineraryPreviewHint}>
                    {expanded ? 'Show less' : 'Show more'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    );
  }


export default function BestMatchesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    
    // Get priorities from params (passed from set-priorities page)
    const budget = params.budget ? parseInt(params.budget as string) : 50;
    const travelStyle = params.travelStyle ? parseInt(params.travelStyle as string) : 50;
    const planning = params.planning ? parseInt(params.planning as string) : 50;
    
    // Get trip details from create-trip (passed through set-priorities)
    const departureLocation = (params.departureLocation as string) || '';
    const destination = (params.destination as string) || '';
    const startDate = (params.startDate as string) || '';
    const endDate = (params.endDate as string) || '';

    const [isLoading, setIsLoading] = useState(true);
    const [recommendations, setRecommendations] = useState<TripRecommendation[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<TripRecommendation | null>(null);
    // Track image URLs by trip ID
    const imageUrlMap = React.useRef<Map<string, string>>(new Map());

useEffect(() => {
  const fetchTrips = async () => {
    try {
      setIsLoading(true);
      const apiBaseUrl = getApiBaseUrl();
      
      const resp = await fetch(`${apiBaseUrl}/api/generate-trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget,
          travelStyle,
          planning,
          departureLocation,
          destination,
          startDate,
          endDate,
          maxResults: 3
        })
      });

      const json = await resp.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to generate trips');
      }

      // Map the API trip format to your UI TripRecommendation
      const apiTrips = json.trips || [];
            const safeParse = (val: any) => {
                if (!val) return null;
                if (Array.isArray(val) || typeof val === 'object') return val;
                if (typeof val === 'string') {
                    try {
                        return JSON.parse(val);
                    } catch {
                        return null;
                    }
                }
                return null;
            };

        const mapped: TripRecommendation[] = apiTrips.map((t: any, idx: number) => {
        const itineraryArray = Array.isArray(t.itinerary)
            ? t.itinerary
            : safeParse(t.itinerary) || [];

        const destinationName = t.destination || t.title || 'Unknown';

        return {
            id: t.id || String(idx),
            destination: destinationName,
            cost: Math.round((t.costBreakdown && t.costBreakdown.totalUSD) || t.budgetUSD || 0),
            duration: ((t.durationDays || 1) * 24),
            accommodation: t.accommodations || 'Hotel',
            image: { uri: '' }, // Will be set by component via API call
            description: t.description || '',
            isGroupMatch: !!t.isGroupMatch || false,
            // matchScore is already 0–100 in your sample, so just round:
            matchPercentage: typeof t.matchScore === 'number' ? Math.round(t.matchScore) : 75,
            itinerary: itineraryArray as string[],
            costBreakdown:
            typeof t.costBreakdown === 'object'
                ? t.costBreakdown
                : safeParse(t.costBreakdown) || undefined,
        };
        });

      setRecommendations(mapped);
    } catch (err) {
      console.error(err);
      // fallback: keep mockTrips or show error UI
    } finally {
      setIsLoading(false);
    }
  };

  fetchTrips();
}, [budget, travelStyle, planning, departureLocation, destination, startDate, endDate]);

    const handleSelectTrip = (trip: TripRecommendation) => {
        // open detail overlay
        setSelectedTrip(trip);
    };

    const handleConfirmTrip = (trip: TripRecommendation, imageUrl?: string) => {
        // Get image URL from map or use provided/fallback
        let imageUrlToSave = imageUrl || imageUrlMap.current.get(trip.id) || trip.imageUrl;
        if (!imageUrlToSave) {
            const activity = Array.isArray(trip.itinerary) && trip.itinerary.length > 0 ? trip.itinerary[0] : '';
            const hashInput = `${trip.destination}-${activity || ''}-${trip.id}`;
            let hash = 0;
            for (let i = 0; i < hashInput.length; i++) {
                hash = ((hash << 5) - hash) + hashInput.charCodeAt(i);
                hash = hash & hash;
            }
            const seed = Math.abs(hash);
            imageUrlToSave = `https://picsum.photos/seed/${seed}/800/400`;
        }
        
        router.push({
            pathname: '/trip-confirmed',
            params: {
                destination: trip.destination,
                startDate: startDate,
                endDate: endDate,
                cost: (trip.cost || 0).toString(),
                duration: (trip.duration || 0).toString(),
                accommodation: trip.accommodation,
                description: trip.description,
                matchPercentage: trip.matchPercentage.toString(),
                imageUrl: imageUrlToSave,
                itinerary: trip.itinerary ? JSON.stringify(trip.itinerary) : '',
                costBreakdown: trip.costBreakdown ? JSON.stringify(trip.costBreakdown) : '',
            },
        });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color="#1C4E80" />
                    </Pressable>
                    <Text style={styles.stepIndicator}>Step 3 of 4</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Best Matches</Text>
                    <Text style={styles.subtitle}>Based on your groups preferences</Text>
                    
                    {/* Progress Bar */}
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: '75%' }]} />
                    </View>
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#1C4E80" />
                        <Text style={styles.loadingText}>Finding your perfect matches...</Text>
                    </View>
                ) : (
                    <>
                        {/* Top Recommendations */}
                        <View style={styles.recommendationsSection}>
                            <Text style={styles.sectionTitle}>Top Recommendations</Text>
                            
                            {recommendations.map((trip) => (
                                <RecommendationCard 
                                    key={trip.id} 
                                    trip={trip} 
                                    onSelect={() => handleSelectTrip(trip)}
                                    onImageUrlChange={(url) => imageUrlMap.current.set(trip.id, url)}
                                />
                            ))}
                        </View>

                        {/* Spacer for button */}
                        <View style={{ height: 100 }} />
                    </>
                )}
            </ScrollView>

        {selectedTrip && (
            <TripDetailWithImage 
                trip={selectedTrip} 
                imageUrl={imageUrlMap.current.get(selectedTrip.id)}
                onClose={() => setSelectedTrip(null)} 
                onConfirm={handleConfirmTrip} 
            />
        )}

    </View>
    );
}

// Render detail overlay at bottom of file so styles are in scope
// This wrapper component tracks the image URL from the RecommendationCard
function TripDetailWithImage({ trip, imageUrl, onClose, onConfirm }: { trip: TripRecommendation; imageUrl?: string; onClose: () => void; onConfirm: (t: TripRecommendation, imageUrl?: string) => void }) {
    // Use provided imageUrl or generate fallback
    const finalImageUrl = imageUrl || trip.imageUrl || (() => {
        const activity = Array.isArray(trip.itinerary) && trip.itinerary.length > 0 ? trip.itinerary[0] : '';
        const hashInput = `${trip.destination}-${activity || ''}-${trip.id}`;
        let hash = 0;
        for (let i = 0; i < hashInput.length; i++) {
            hash = ((hash << 5) - hash) + hashInput.charCodeAt(i);
            hash = hash & hash;
        }
        const seed = Math.abs(hash);
        return `https://picsum.photos/seed/${seed}/800/400`;
    })();
    
    return (
        <View style={styles.detailOverlay}>
            <ScrollView contentContainerStyle={styles.detailContent}>
                <View style={styles.detailHeader}>
                    <Text style={styles.detailTitle}>{trip.destination}</Text>
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <MaterialIcons name="close" size={20} color="#1C4E80" />
                    </Pressable>
                </View>

                <Text style={styles.detailSubtitle}>{trip.description}</Text>

                {trip.costBreakdown && (
                    <View style={styles.costBox}>
                        <Text style={styles.costBoxTitle}>Price estimate</Text>
                        <View style={styles.costRow}><Text>Flight</Text><Text>${(trip.costBreakdown.flightUSD || 0).toLocaleString()}</Text></View>
                        <View style={styles.costRow}><Text>Hotel ({trip.costBreakdown.hotelNights || 0} nights)</Text><Text>${(trip.costBreakdown.hotelTotalUSD || 0).toLocaleString()}</Text></View>
                        <View style={styles.costRow}><Text>Transport</Text><Text>${(trip.costBreakdown.transportUSD || 0).toLocaleString()}</Text></View>
                        <View style={styles.costRow}><Text>Activities</Text><Text>${(trip.costBreakdown.activitiesUSD || 0).toLocaleString()}</Text></View>
                        <View style={styles.costRow}><Text>Taxes & Fees</Text><Text>${(trip.costBreakdown.taxesFeesUSD || 0).toLocaleString()}</Text></View>
                        <View style={[styles.costRow, styles.costTotal]}><Text style={styles.costTotalText}>Total</Text><Text style={styles.costTotalText}>${(trip.costBreakdown.totalUSD || 0).toLocaleString()}</Text></View>
                        <Text style={styles.perPerson}>Per person: ${(trip.costBreakdown.perPersonUSD || 0).toLocaleString()}</Text>
                    </View>
                )}

                {trip.itinerary && trip.itinerary.length > 0 && (
                <View style={styles.itinerarySection}>
                    <Text style={styles.sectionTitle}>Things to do</Text>
                    {trip.itinerary.map((item, i) => (
                    <Text key={i} style={styles.itineraryActivity}>
                        • {item}
                    </Text>
                    ))}
                </View>
                )}

                <View style={styles.detailActions}>
                    <Pressable style={styles.confirmButton} onPress={() => onConfirm(trip, finalImageUrl)}>
                        <Text style={styles.confirmButtonText}>Confirm Trip</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
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
    stepIndicator: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1C4E80',
    },
    headerSpacer: {
        width: 40,
    },
    titleSection: {
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1E1E1E',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6C6C6C',
        fontWeight: '400',
        marginBottom: 16,
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#1C4E80',
        borderRadius: 2,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6C6C6C',
        fontWeight: '400',
    },
    recommendationsSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '600',
        color: '#1E1E1E',
        marginBottom: 20,
    },
    recommendationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        overflow: 'hidden',
    },
    imageContainer: {
        position: 'relative',
        width: '100%',
        height: 200,
        backgroundColor: '#E5E7EB', // Background color while loading
    },
    tripImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#E5E7EB', // Background color while loading
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 12,
    },
    imageOverlayText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    matchBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#FFD700',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    matchBadgeText: {
        color: '#1E1E1E',
        fontSize: 14,
        fontWeight: '700',
    },
    cardContent: {
        padding: 16,
    },
    destinationName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1E1E1E',
        marginBottom: 12,
    },
    priceContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    priceLabel: {
        fontSize: 12,
        color: '#6C6C6C',
        fontWeight: '500',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    priceAmount: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1C4E80',
        marginBottom: 2,
    },
    pricePerPerson: {
        fontSize: 12,
        color: '#6C6C6C',
        fontWeight: '400',
    },
    tripDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 14,
        color: '#6C6C6C',
        fontWeight: '400',
    },
    buttonContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    /* Detail overlay styles */
    detailOverlay: {
        position: 'absolute',
        top: 80,
        left: 12,
        right: 12,
        bottom: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
        overflow: 'hidden',
    },
    detailContent: {
        padding: 16,
        paddingBottom: 40,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E1E1E',
    },
    closeButton: {
        padding: 8,
    },
    detailSubtitle: {
        fontSize: 14,
        color: '#6C6C6C',
        marginBottom: 12,
    },
    costBox: {
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    costBoxTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    costRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    costTotal: {
        borderTopWidth: 1,
        borderTopColor: '#E6E9EE',
        marginTop: 8,
        paddingTop: 8,
    },
    costTotalText: {
        fontWeight: '700',
    },
    perPerson: {
        marginTop: 8,
        color: '#6C6C6C',
        fontSize: 12,
    },
    itinerarySection: {
        marginTop: 12,
    },
    itineraryDay: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    itineraryDayTitle: {
        fontWeight: '600',
        marginBottom: 6,
    },
    itinerarySummary: {
        color: '#6C6C6C',
        marginBottom: 6,
    },
    itineraryActivity: {
        color: '#4B5563',
        marginLeft: 6,
    },
    hotelBox: {
        marginTop: 8,
        backgroundColor: '#FFFFFF',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    hotelName: {
        fontWeight: '600',
    },
    hotelInfo: {
        color: '#6C6C6C',
        fontSize: 12,
    },
    detailActions: {
        marginTop: 16,
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: '#1C4E80',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
        itineraryPreview: {
        marginTop: 12,
    },
    itineraryPreviewLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6C6C6C',
        marginBottom: 4,
    },
    itineraryPreviewText: {
        fontSize: 14,
        color: '#4B5563',
    },
    itineraryPreviewHint: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },

});

