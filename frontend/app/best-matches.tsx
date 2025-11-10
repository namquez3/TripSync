import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Image,
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
}

// Mock trip data
const mockTrips: Omit<TripRecommendation, 'matchPercentage'>[] = [
    {
        id: '1',
        destination: 'Santorini, Greece',
        cost: 1800,
        duration: 12,
        accommodation: '5-star Resort',
        image: require('@/assets/images/react-logo.png'), // Placeholder
        description: 'Direct Flight + Luxury Resort',
        isGroupMatch: true,
    },
    {
        id: '2',
        destination: 'Bali, Indonesia',
        cost: 1200,
        duration: 16,
        accommodation: '4-star Hotel',
        image: require('@/assets/images/react-logo.png'),
        description: 'Scenic Route + Beach Resort',
        isGroupMatch: true,
    },
    {
        id: '3',
        destination: 'Tokyo, Japan',
        cost: 2200,
        duration: 14,
        accommodation: '5-star Hotel',
        image: require('@/assets/images/react-logo.png'),
        description: 'Fast Direct + City Center',
        isGroupMatch: true,
    },
    {
        id: '4',
        destination: 'Paris, France',
        cost: 1600,
        duration: 10,
        accommodation: '4-star Hotel',
        image: require('@/assets/images/react-logo.png'),
        description: 'Budget Friendly + Central',
        isGroupMatch: false,
    },
    {
        id: '5',
        destination: 'Dubai, UAE',
        cost: 2600,
        duration: 6,
        accommodation: 'Luxury Resort',
        image: require('@/assets/images/react-logo.png'),
        description: 'Ultra Luxury + Fast',
        isGroupMatch: false,
    },
];

// Simulate AI-based matching algorithm
const calculateMatchPercentage = (
    trip: Omit<TripRecommendation, 'matchPercentage'>,
    budget: number,
    travelStyle: number,
    planning: number
): number => {
    let score = 0;
    let maxScore = 0;

    // Budget matching (0-100 scale, where 0 = budget, 100 = luxury)
    // If user prefers budget (low value), lower cost trips score higher
    // If user prefers luxury (high value), higher cost trips score higher
    const budgetPreference = budget; // 0-100
    const normalizedCost = (trip.cost / 3000) * 100; // Normalize cost to 0-100
    const budgetScore = 100 - Math.abs(budgetPreference - normalizedCost);
    score += budgetScore * 0.4; // 40% weight
    maxScore += 100 * 0.4;

    // Travel Style matching (0-100 scale, where 0 = speed, 100 = comfort)
    // Shorter duration = faster, longer duration = more comfortable/scenic
    const travelStylePreference = travelStyle; // 0-100
    const normalizedDuration = (trip.duration / 20) * 100; // Normalize duration to 0-100
    const travelScore = 100 - Math.abs(travelStylePreference - normalizedDuration);
    score += travelScore * 0.35; // 35% weight
    maxScore += 100 * 0.35;

    // Planning matching (0-100 scale, where 0 = flexible, 100 = certain)
    // This is more about trip structure - group matches are more certain
    const planningPreference = planning; // 0-100
    const planningScore = trip.isGroupMatch
        ? Math.min(100, planningPreference + 20) // Group matches favor certainty
        : Math.max(0, planningPreference - 20); // Individual trips favor flexibility
    score += planningScore * 0.25; // 25% weight
    maxScore += 100 * 0.25;

    // Calculate final percentage
    const matchPercentage = Math.round((score / maxScore) * 100);
    return Math.max(60, Math.min(99, matchPercentage)); // Clamp between 60-99%
};

function RecommendationCard({ 
    trip, 
    onSelect 
}: { 
    trip: TripRecommendation;
    onSelect: () => void;
}) {
    return (
        <Pressable onPress={onSelect} style={styles.recommendationCard}>
            <View style={styles.imageContainer}>
                <Image source={trip.image} style={styles.tripImage} resizeMode="cover" />
                <View style={styles.imageOverlay}>
                    <Text style={styles.imageOverlayText}>{trip.description}</Text>
                </View>
                <View style={styles.matchBadge}>
                    <Text style={styles.matchBadgeText}>{trip.matchPercentage}% Match</Text>
                </View>
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.destinationName}>{trip.destination}</Text>
                <View style={styles.tripDetails}>
                    <View style={styles.detailItem}>
                        <MaterialIcons name="attach-money" size={18} color="#1C4E80" />
                        <Text style={styles.detailText}>${trip.cost.toLocaleString()}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <MaterialIcons name="access-time" size={18} color="#1C4E80" />
                        <Text style={styles.detailText}>{trip.duration}h</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <MaterialIcons name="hotel" size={18} color="#1C4E80" />
                        <Text style={styles.detailText}>{trip.accommodation}</Text>
                    </View>
                </View>
            </View>
        </Pressable>
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
    const destination = (params.destination as string) || '';
    const startDate = (params.startDate as string) || '';
    const endDate = (params.endDate as string) || '';

    const [isLoading, setIsLoading] = useState(true);
    const [recommendations, setRecommendations] = useState<TripRecommendation[]>([]);

    useEffect(() => {
        // Simulate AI processing time (2-4 seconds)
        const processingTime = 2000 + Math.random() * 2000;
        
        const timer = setTimeout(() => {
            // Calculate match percentages for all trips
            const tripsWithMatches = mockTrips.map((trip) => ({
                ...trip,
                matchPercentage: calculateMatchPercentage(trip, budget, travelStyle, planning),
            }));

            // Sort by match percentage (highest first)
            tripsWithMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

            // Take top 3 recommendations
            setRecommendations(tripsWithMatches.slice(0, 3));
            setIsLoading(false);
        }, processingTime);

        return () => clearTimeout(timer);
    }, [budget, travelStyle, planning]);

    const handleSelectTrip = (trip: TripRecommendation) => {
        router.push({
            pathname: '/trip-confirmed',
            params: {
                destination: trip.destination,
                startDate: startDate,
                endDate: endDate,
                cost: trip.cost.toString(),
                duration: trip.duration.toString(),
                accommodation: trip.accommodation,
                description: trip.description,
                matchPercentage: trip.matchPercentage.toString(),
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
                    <Text style={styles.subtitle}>Based on your group's preferences</Text>
                    
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
                                />
                            ))}
                        </View>

                        {/* Spacer for button */}
                        <View style={{ height: 100 }} />
                    </>
                )}
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
    },
    tripImage: {
        width: '100%',
        height: '100%',
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
});

