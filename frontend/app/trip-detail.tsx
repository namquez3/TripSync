import { deleteTrip, getTripById, SavedTrip } from '@/services/tripStorage';
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const formatFlightDate = (dateStr: string): string => {
    if (!dateStr || !dateStr.includes('/')) return '';
    try {
        const [month, day, year] = dateStr.split('/');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[parseInt(month, 10) - 1] || month;
        return `${monthName} ${day}, ${year}`;
    } catch {
        return dateStr;
    }
};

const getFlightInfo = (destination: string, duration: number, startDate?: string, endDate?: string) => {
    const flights: Record<string, { airline: string; flightNumber: string; departureTime: string; arrivalTime: string }> = {
        'Santorini, Greece': {
            airline: 'Delta Airlines',
            flightNumber: 'DL 245',
            departureTime: '8:00 AM',
            arrivalTime: '4:00 PM',
        },
        'Bali, Indonesia': {
            airline: 'Singapore Airlines',
            flightNumber: 'SQ 892',
            departureTime: '10:30 AM',
            arrivalTime: '2:30 AM+1',
        },
        'Tokyo, Japan': {
            airline: 'Japan Airlines',
            flightNumber: 'JL 61',
            departureTime: '11:00 AM',
            arrivalTime: '3:00 PM',
        },
        'Paris, France': {
            airline: 'Air France',
            flightNumber: 'AF 83',
            departureTime: '9:15 AM',
            arrivalTime: '11:30 PM',
        },
        'Dubai, UAE': {
            airline: 'Emirates',
            flightNumber: 'EK 201',
            departureTime: '10:00 AM',
            arrivalTime: '8:00 AM+1',
        },
        'Vegas': {
            airline: 'American Airlines',
            flightNumber: 'AA 1234',
            departureTime: '8:00 AM',
            arrivalTime: '10:30 AM',
        },
    };
    
    const getDefaultAirline = (dest: string): string => {
        const destLower = dest.toLowerCase();
        if (destLower.includes('miami') || destLower.includes('florida') || destLower.includes('united states') || destLower.includes('usa')) {
            return 'American Airlines';
        } else if (destLower.includes('europe') || destLower.includes('london') || destLower.includes('paris') || destLower.includes('rome') || destLower.includes('barcelona')) {
            return 'Lufthansa';
        } else if (destLower.includes('asia') || destLower.includes('tokyo') || destLower.includes('japan') || destLower.includes('singapore')) {
            return 'United Airlines';
        } else if (destLower.includes('australia') || destLower.includes('sydney') || destLower.includes('melbourne')) {
            return 'Qantas';
        } else if (destLower.includes('canada') || destLower.includes('toronto') || destLower.includes('vancouver')) {
            return 'Air Canada';
        } else if (destLower.includes('mexico') || destLower.includes('cancun') || destLower.includes('mexico city')) {
            return 'Aeromexico';
        } else if (destLower.includes('brazil') || destLower.includes('south america')) {
            return 'LATAM Airlines';
        }
        return 'American Airlines';
    };
    
    const defaultAirline = getDefaultAirline(destination);
    const flightData = flights[destination] || {
        airline: defaultAirline,
        flightNumber: defaultAirline === 'American Airlines' ? 'AA 1234' : 
                     defaultAirline === 'Lufthansa' ? 'LH 456' :
                     defaultAirline === 'United Airlines' ? 'UA 789' :
                     defaultAirline === 'Qantas' ? 'QF 12' :
                     defaultAirline === 'Air Canada' ? 'AC 123' :
                     defaultAirline === 'Aeromexico' ? 'AM 456' :
                     defaultAirline === 'LATAM Airlines' ? 'LA 789' : 'AA 1234',
        departureTime: '9:00 AM',
        arrivalTime: '5:00 PM',
    };
    
    // Format departure and arrival with dates
    const departureDate = startDate ? formatFlightDate(startDate) : '';
    const arrivalDate = endDate ? formatFlightDate(endDate) : '';
    
    return {
        airline: flightData.airline,
        flightNumber: flightData.flightNumber,
        departure: startDate ? `${flightData.departureTime}, ${departureDate}` : flightData.departureTime,
        arrival: endDate ? `${flightData.arrivalTime}, ${arrivalDate}` : flightData.arrivalTime,
    };
};

const getHotelInfo = (destination: string, accommodation: string | object) => {
    const accommodationStr = typeof accommodation === 'string' 
        ? accommodation 
        : (accommodation && typeof accommodation === 'object' 
            ? (accommodation as any)?.name || (accommodation as any)?.type || String(accommodation) 
            : String(accommodation || 'Hotel'));
    
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
        'Miami, Florida': {
            name: 'Miami Beach Resort',
            address: 'South Beach, Miami, FL 33139',
            rating: '4.6',
        },
    };
    
    const hotelData = hotels[destination];
    if (hotelData) {
        return hotelData;
    }
    
    return {
        name: accommodationStr && accommodationStr !== 'Hotel' ? `${accommodationStr} - ${destination}` : `${destination} Hotel`,
        address: destination,
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

    const flightInfo = getFlightInfo(trip.destination, trip.duration, trip.startDate, trip.endDate);
    const accommodationStr = typeof trip.accommodation === 'string' 
        ? trip.accommodation 
        : (trip.accommodation && typeof trip.accommodation === 'object' 
            ? String(trip.accommodation) 
            : String(trip.accommodation || 'Hotel'));
    const hotelInfo = getHotelInfo(trip.destination, accommodationStr);

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
            if (dateStr.includes('/')) {
                const [month, day, year] = dateStr.split('/');
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (isNaN(date.getTime())) {
                    return dateStr;
                }
                return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            }
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return dateStr;
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

    const getFlightBookingUrl = () => {
        const formatDateForUrl = (dateStr: string) => {
            if (!dateStr || !dateStr.includes('/')) return '';
            const [month, day, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        };
        
        const formattedStartDate = formatDateForUrl(trip.startDate);
        const formattedEndDate = formatDateForUrl(trip.endDate);
        const dest = trip.destination.trim();
        
        if (formattedStartDate && formattedEndDate) {
            return `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(dest)}%20${formattedStartDate}%20returning%20${formattedEndDate}`;
        } else if (formattedStartDate) {
            return `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(dest)}%20on%20${formattedStartDate}`;
        }
        return `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(dest)}`;
    };

    const getHotelBookingUrl = () => {
        const formatDateForUrl = (dateStr: string) => {
            if (!dateStr || !dateStr.includes('/')) return '';
            const [month, day, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        };
        
        const checkin = formatDateForUrl(trip.startDate);
        const checkout = formatDateForUrl(trip.endDate);
        const dest = trip.destination.trim();
        
        const hotelSearchQuery = dest;
        
        const params = new URLSearchParams({
            ss: hotelSearchQuery, // Search for hotels in destination
        });
        if (checkin) params.append('checkin', checkin);
        if (checkout) params.append('checkout', checkout);
        
        return `https://www.booking.com/searchresults.html?${params.toString()}`;
    };

    const handleBookFlight = async () => {
        const url = getFlightBookingUrl();
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                console.error('Cannot open URL:', url);
                Alert.alert('Error', 'Unable to open flight booking. Please try again.');
            }
        } catch (error) {
            console.error('Error opening flight booking:', error);
            Alert.alert('Error', 'Failed to open flight booking. Please try again.');
        }
    };

    const handleBookHotel = async () => {
        const url = getHotelBookingUrl();
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                console.error('Cannot open URL:', url);
                Alert.alert('Error', 'Unable to open hotel booking. Please try again.');
            }
        } catch (error) {
            console.error('Error opening hotel booking:', error);
            Alert.alert('Error', 'Failed to open hotel booking. Please try again.');
        }
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
                        <Pressable style={styles.bookButton} onPress={handleBookFlight}>
                            <MaterialIcons name="open-in-new" size={18} color="#1C4E80" />
                            <Text style={styles.bookButtonText}>Book Flight</Text>
                        </Pressable>
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
                                <Text style={styles.infoValue}>{typeof hotelInfo.name === 'string' ? hotelInfo.name : String(hotelInfo.name || 'Hotel')}</Text>
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
                        <Pressable style={styles.bookButton} onPress={handleBookHotel}>
                            <MaterialIcons name="open-in-new" size={18} color="#1C4E80" />
                            <Text style={styles.bookButtonText}>Book Hotel</Text>
                        </Pressable>
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
    bookButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#1C4E80',
    },
    bookButtonText: {
        fontSize: 16,
        color: '#1C4E80',
        fontWeight: '600',
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

