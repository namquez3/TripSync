import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTripById, SavedTrip, deleteTrip } from '@/services/tripStorage';

// Mock flight and hotel data based on trip selection
const getFlightInfo = (destination: string, duration: number) => {
    const flights: Record<string, { airline: string; flightNumber: string; departure: string; arrival: string }> = {
        'Santorini, Greece': {
            airline: 'Delta Airlines',
            flightNumber: 'DL 245',
            departure: '8:00 AM',
            arrival: '4:00 PM',
        },
        'Bali, Indonesia': {
            airline: 'Singapore Airlines',
            flightNumber: 'SQ 892',
            departure: '10:30 AM',
            arrival: '2:30 AM+1',
        },
        'Tokyo, Japan': {
            airline: 'Japan Airlines',
            flightNumber: 'JL 61',
            departure: '11:00 AM',
            arrival: '3:00 PM',
        },
        'Paris, France': {
            airline: 'Air France',
            flightNumber: 'AF 83',
            departure: '9:15 AM',
            arrival: '11:30 PM',
        },
        'Dubai, UAE': {
            airline: 'Emirates',
            flightNumber: 'EK 201',
            departure: '10:00 AM',
            arrival: '8:00 AM+1',
        },
        'Vegas': {
            airline: 'American Airlines',
            flightNumber: 'AA 1234',
            departure: '8:00 AM',
            arrival: '10:30 AM',
        },
    };
    return flights[destination] || {
        airline: 'International Airlines',
        flightNumber: 'IA 123',
        departure: '9:00 AM',
        arrival: '5:00 PM',
    };
};

const getHotelInfo = (destination: string, accommodation: string) => {
    const hotels: Record<string, { name: string; address: string; rating: string }> = {
        'Santorini, Greece': {
            name: 'Santorini Luxury Resort',
            address: 'Oia, Santorini 84702, Greece',
            rating: '5.0',
        },
        'Bali, Indonesia': {
            name: 'Bali Beach Resort',
            address: 'Seminyak, Bali 80361, Indonesia',
            rating: '4.8',
        },
        'Tokyo, Japan': {
            name: 'Tokyo Grand Hotel',
            address: 'Shibuya, Tokyo 150-0001, Japan',
            rating: '4.9',
        },
        'Paris, France': {
            name: 'Paris Central Hotel',
            address: 'Champs-Élysées, Paris 75008, France',
            rating: '4.7',
        },
        'Dubai, UAE': {
            name: 'Dubai Luxury Resort',
            address: 'Downtown Dubai, UAE',
            rating: '5.0',
        },
        'Vegas': {
            name: 'Las Vegas Strip Hotel',
            address: 'Las Vegas Strip, NV',
            rating: '4.5',
        },
    };
    return hotels[destination] || {
        name: `${accommodation} - ${destination}`,
        address: `${destination}`,
        rating: '4.5',
    };
};

export default function TripDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const [trip, setTrip] = useState<SavedTrip | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadTrip = async () => {
            try {
                const tripId = params.tripId as string;
                if (tripId) {
                    const loadedTrip = await getTripById(tripId);
                    setTrip(loadedTrip);
                }
            } catch (error) {
                console.error('Error loading trip:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadTrip();
    }, [params.tripId]);

    if (isLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#1C4E80" />
            </View>
        );
    }

    if (!trip) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color="#1C4E80" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Trip Details</Text>
                    <View style={styles.headerSpacer} />
                </View>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Trip not found</Text>
                </View>
            </View>
        );
    }

    // Get flight and hotel information
    const flightInfo = getFlightInfo(trip.destination, trip.duration);
    const hotelInfo = getHotelInfo(trip.destination, trip.accommodation);

    // Use stored image URL or generate fallback
    const getImageUrl = () => {
        if (trip.imageUrl) {
            return trip.imageUrl;
        }
        // Fallback: generate from destination
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
                return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            }
            // Handle ISO format or other formats
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return dateStr; // Return original if invalid
            }
            return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Trip',
            `Are you sure you want to delete your trip to ${trip.destination}? This action cannot be undone.`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteTrip(trip.id);
                            router.back(); // Navigate back to home screen
                        } catch (error) {
                            console.error('Error deleting trip:', error);
                            Alert.alert('Error', 'Failed to delete trip. Please try again.');
                        }
                    },
                },
            ]
        );
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
                    <Text style={styles.headerTitle}>Trip Details</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Trip Image */}
                <View style={styles.imageContainer}>
                    <Image 
                        source={{ uri: getImageUrl() }} 
                        style={styles.tripImage} 
                        resizeMode="cover"
                    />
                </View>

                {/* Summary Card */}
                <View style={styles.summaryCard}>
                    {/* Destination Header */}
                    <View style={styles.destinationHeader}>
                        <View style={styles.destinationIcon}>
                            <MaterialIcons name="place" size={28} color="#1C4E80" />
                        </View>
                        <View style={styles.destinationInfo}>
                            <Text style={styles.destinationName}>{trip.destination}</Text>
                            <Text style={styles.dateRange}>
                                {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                            </Text>
                        </View>
                    </View>

                    {trip.description && (
                        <>
                            <View style={styles.divider} />
                            <Text style={styles.description}>{trip.description}</Text>
                        </>
                    )}

                    {/* Flight Information */}
                    <View style={styles.divider} />
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="flight" size={20} color="#1C4E80" />
                            <Text style={styles.sectionTitle}>Flight</Text>
                        </View>
                        <View style={styles.sectionContent}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Airline:</Text>
                                <Text style={styles.infoValue}>{flightInfo.airline}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Flight:</Text>
                                <Text style={styles.infoValue}>{flightInfo.flightNumber}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Departure:</Text>
                                <Text style={styles.infoValue}>{flightInfo.departure}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Arrival:</Text>
                                <Text style={styles.infoValue}>{flightInfo.arrival}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Duration:</Text>
                                <Text style={styles.infoValue}>{trip.duration}h</Text>
                            </View>
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Hotel Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="hotel" size={20} color="#1C4E80" />
                            <Text style={styles.sectionTitle}>Accommodation</Text>
                        </View>
                        <View style={styles.sectionContent}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Hotel:</Text>
                                <Text style={styles.infoValue}>{hotelInfo.name}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Type:</Text>
                                <Text style={styles.infoValue}>{trip.accommodation}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Address:</Text>
                                <Text style={[styles.infoValue, styles.addressText]}>
                                    {hotelInfo.address}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Rating:</Text>
                                <View style={styles.ratingContainer}>
                                    <MaterialIcons name="star" size={16} color="#FFD700" />
                                    <Text style={styles.ratingText}>{hotelInfo.rating}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Itinerary */}
                    {trip.itinerary && trip.itinerary.length > 0 && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <MaterialIcons name="list" size={20} color="#1C4E80" />
                                    <Text style={styles.sectionTitle}>Things to do</Text>
                                </View>
                                <View style={styles.itineraryContent}>
                                    {trip.itinerary.map((item, index) => (
                                        <View key={index} style={styles.itineraryItem}>
                                            <Text style={styles.itineraryBullet}>•</Text>
                                            <Text style={styles.itineraryText}>{item}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </>
                    )}

                    {/* Cost Breakdown */}
                    {trip.costBreakdown && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <MaterialIcons name="attach-money" size={20} color="#1C4E80" />
                                    <Text style={styles.sectionTitle}>Cost Breakdown</Text>
                                </View>
                                <View style={styles.sectionContent}>
                                    {trip.costBreakdown.flightUSD && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Flight:</Text>
                                            <Text style={styles.infoValue}>${trip.costBreakdown.flightUSD.toLocaleString()}</Text>
                                        </View>
                                    )}
                                    {trip.costBreakdown.hotelTotalUSD && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Hotel ({trip.costBreakdown.hotelNights || 0} nights):</Text>
                                            <Text style={styles.infoValue}>${trip.costBreakdown.hotelTotalUSD.toLocaleString()}</Text>
                                        </View>
                                    )}
                                    {trip.costBreakdown.transportUSD && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Transport:</Text>
                                            <Text style={styles.infoValue}>${trip.costBreakdown.transportUSD.toLocaleString()}</Text>
                                        </View>
                                    )}
                                    {trip.costBreakdown.activitiesUSD && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Activities:</Text>
                                            <Text style={styles.infoValue}>${trip.costBreakdown.activitiesUSD.toLocaleString()}</Text>
                                        </View>
                                    )}
                                    {trip.costBreakdown.taxesFeesUSD && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Taxes & Fees:</Text>
                                            <Text style={styles.infoValue}>${trip.costBreakdown.taxesFeesUSD.toLocaleString()}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </>
                    )}

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Cost Summary */}
                    <View style={styles.costSection}>
                        <View style={styles.costRow}>
                            <Text style={styles.costLabel}>Total Cost:</Text>
                            <Text style={styles.totalCost}>${trip.cost.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Delete Button */}
                <View style={styles.deleteButtonContainer}>
                    <Pressable style={styles.deleteButton} onPress={handleDelete}>
                        <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                        <Text style={styles.deleteButtonText}>Delete Trip</Text>
                    </Pressable>
                </View>

                {/* Spacer */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F6F8FC',
    },
    scrollContent: {
        paddingBottom: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E1E1E',
    },
    headerSpacer: {
        width: 40,
    },
    imageContainer: {
        width: '100%',
        height: 250,
        marginBottom: 16,
    },
    tripImage: {
        width: '100%',
        height: '100%',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorText: {
        fontSize: 18,
        color: '#6C6C6C',
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    destinationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    destinationIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    destinationInfo: {
        flex: 1,
    },
    destinationName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1E1E1E',
        marginBottom: 4,
    },
    dateRange: {
        fontSize: 16,
        color: '#6C6C6C',
        fontWeight: '400',
    },
    description: {
        fontSize: 15,
        color: '#4B5563',
        lineHeight: 22,
        marginBottom: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E1E1E',
    },
    sectionContent: {
        gap: 10,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 4,
    },
    infoLabel: {
        fontSize: 14,
        color: '#6C6C6C',
        fontWeight: '400',
        flex: 1,
    },
    infoValue: {
        fontSize: 14,
        color: '#1E1E1E',
        fontWeight: '500',
        flex: 2,
        textAlign: 'right',
    },
    addressText: {
        fontSize: 13,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 14,
        color: '#1E1E1E',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 20,
    },
    itineraryContent: {
        gap: 12,
    },
    itineraryItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    itineraryBullet: {
        fontSize: 18,
        color: '#1C4E80',
        fontWeight: '700',
    },
    itineraryText: {
        flex: 1,
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    costSection: {
        backgroundColor: '#F6F8FC',
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    costRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    costLabel: {
        fontSize: 16,
        color: '#6C6C6C',
        fontWeight: '400',
    },
    totalCost: {
        fontSize: 20,
        color: '#1E1E1E',
        fontWeight: '700',
    },
    costPerPerson: {
        fontSize: 18,
        color: '#1C4E80',
        fontWeight: '600',
    },
    deleteButtonContainer: {
        marginTop: 24,
        marginHorizontal: 16,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        gap: 8,
    },
    deleteButtonText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
    },
});

