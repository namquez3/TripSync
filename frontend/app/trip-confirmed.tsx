import { saveTrip } from '@/services/tripStorage';
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Helper function to format date (MM/DD/YYYY) to readable format
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

// Mock flight and hotel data based on trip selection
const getFlightInfo = (destination: string, duration: number, startDate?: string, endDate?: string) => {
    const flights: Record<string, { airline: string; flightNumber: string; departureTime: string; arrivalTime: string; returnFlightNumber: string; returnDepartureTime: string; returnArrivalTime: string }> = {
        'Santorini, Greece': {
            airline: 'Delta Airlines',
            flightNumber: 'DL 245',
            departureTime: '8:00 AM',
            arrivalTime: '4:00 PM',
            returnFlightNumber: 'DL 246',
            returnDepartureTime: '2:00 PM',
            returnArrivalTime: '6:00 PM',
        },
        'Bali, Indonesia': {
            airline: 'Singapore Airlines',
            flightNumber: 'SQ 892',
            departureTime: '10:30 AM',
            arrivalTime: '2:30 AM+1',
            returnFlightNumber: 'SQ 893',
            returnDepartureTime: '11:00 PM',
            returnArrivalTime: '7:00 AM+1',
        },
        'Tokyo, Japan': {
            airline: 'Japan Airlines',
            flightNumber: 'JL 61',
            departureTime: '11:00 AM',
            arrivalTime: '3:00 PM',
            returnFlightNumber: 'JL 62',
            returnDepartureTime: '4:00 PM',
            returnArrivalTime: '12:00 PM',
        },
        'Paris, France': {
            airline: 'Air France',
            flightNumber: 'AF 83',
            departureTime: '9:15 AM',
            arrivalTime: '11:30 PM',
            returnFlightNumber: 'AF 84',
            returnDepartureTime: '1:00 PM',
            returnArrivalTime: '4:30 PM',
        },
        'Dubai, UAE': {
            airline: 'Emirates',
            flightNumber: 'EK 201',
            departureTime: '10:00 AM',
            arrivalTime: '8:00 AM+1',
            returnFlightNumber: 'EK 202',
            returnDepartureTime: '2:00 AM',
            returnArrivalTime: '8:00 AM',
        },
    };
    
    const flightData = flights[destination] || {
        airline: 'International Airlines',
        flightNumber: 'IA 123',
        departureTime: '9:00 AM',
        arrivalTime: '5:00 PM',
        returnFlightNumber: 'IA 124',
        returnDepartureTime: '3:00 PM',
        returnArrivalTime: '7:00 PM',
    };
    
    // Format departure date (outbound flight - when leaving origin)
    const departureDate = startDate ? formatFlightDate(startDate) : '';
    // Arrival at destination is typically same day or next day (calculate from departure)
    const arrivalDate = startDate ? formatFlightDate(startDate) : '';
    // Return flight date (when flying back - endDate)
    const returnDate = endDate ? formatFlightDate(endDate) : '';
    
    return {
        airline: flightData.airline,
        flightNumber: flightData.flightNumber,
        departure: startDate ? `${flightData.departureTime}, ${departureDate}` : flightData.departureTime,
        arrival: startDate ? `${flightData.arrivalTime}, ${arrivalDate}` : flightData.arrivalTime,
        returnFlightNumber: flightData.returnFlightNumber,
        returnDeparture: endDate ? `${flightData.returnDepartureTime}, ${returnDate}` : flightData.returnDepartureTime,
        returnArrival: endDate ? `${flightData.returnArrivalTime}, ${returnDate}` : flightData.returnArrivalTime,
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
    };
    return hotels[destination] || {
        name: `${accommodation} - ${destination}`,
        address: `${destination}`,
        rating: '4.5',
    };
};

export default function TripConfirmedScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    // Get all trip data from route params
    const destination = (params.destination as string) || 'Unknown Destination';
    const departureLocation = (params.departureLocation as string) || '';
    const startDate = (params.startDate as string) || '';
    const endDate = (params.endDate as string) || '';
    const totalCost = params.cost ? parseInt(params.cost as string) : 0;
    const accommodation = (params.accommodation as string) || '';
    const duration = params.duration ? parseInt(params.duration as string) : 0;

    // Get flight and hotel information
    const flightInfo = getFlightInfo(destination, duration, startDate, endDate);
    const hotelInfo = getHotelInfo(destination, accommodation);

    // Save trip when component mounts
    useEffect(() => {
        const saveConfirmedTrip = async () => {
            try {
                await saveTrip({
                    destination,
                    startDate,
                    endDate,
                    cost: totalCost,
                    duration,
                    accommodation,
                    description: params.description as string || '',
                    matchPercentage: params.matchPercentage ? parseInt(params.matchPercentage as string) : 0,
                    imageUrl: params.imageUrl as string || undefined,
                    itinerary: params.itinerary ? JSON.parse(params.itinerary as string) : undefined,
                    costBreakdown: params.costBreakdown ? JSON.parse(params.costBreakdown as string) : undefined,
                });
            } catch (error) {
                console.error('Error saving trip:', error);
            }
        };
        saveConfirmedTrip();
    }, []);

    const handleDone = () => {
        // Navigate back to home or trips list
        router.push('/(tabs)');
    };

    // Generate booking URLs
    const getFlightBookingUrl = () => {
        // Format dates for Google Flights (MM/DD/YYYY -> YYYY-MM-DD)
        const formatDateForUrl = (dateStr: string) => {
            if (!dateStr || !dateStr.includes('/')) return '';
            const [month, day, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        };
        
        const formattedStartDate = formatDateForUrl(startDate);
        const formattedEndDate = formatDateForUrl(endDate);
        const origin = departureLocation || '';
        // Use the actual destination entered by the user in Create New Trip
        const dest = destination.trim();
        
        // Google Flights search URL with round trip dates
        if (origin && formattedStartDate && formattedEndDate) {
            // Round trip with both dates
            return `https://www.google.com/travel/flights?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(dest)}%20${formattedStartDate}%20returning%20${formattedEndDate}`;
        } else if (origin && formattedStartDate) {
            // One-way with origin and date
            return `https://www.google.com/travel/flights?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(dest)}%20on%20${formattedStartDate}`;
        } else if (formattedStartDate) {
            // One-way to destination with date
            return `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(dest)}%20on%20${formattedStartDate}`;
        } else if (origin) {
            // Just origin and destination
            return `https://www.google.com/travel/flights?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(dest)}`;
        }
        return `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(dest)}`;
    };

    const getHotelBookingUrl = () => {
        // Format dates for Booking.com (MM/DD/YYYY -> YYYY-MM-DD)
        const formatDateForUrl = (dateStr: string) => {
            if (!dateStr || !dateStr.includes('/')) return '';
            const [month, day, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        };
        
        const checkin = formatDateForUrl(startDate);
        const checkout = formatDateForUrl(endDate);
        const dest = destination.trim();
        
        // Search for hotels in the destination
        const hotelSearchQuery = dest;
        
        // Booking.com search URL using the destination and dates
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
            }
        } catch (error) {
            console.error('Error opening flight booking:', error);
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
            }
        } catch (error) {
            console.error('Error opening hotel booking:', error);
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
                    <Text style={styles.stepIndicator}>Step 4 of 4</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <View style={styles.successIconContainer}>
                        <MaterialIcons name="check-circle" size={64} color="#10B981" />
                    </View>
                    <Text style={styles.title}>Trip Confirmed!</Text>
                    <Text style={styles.subtitle}>
                        Your group trip has been successfully booked
                    </Text>
                    
                    {/* Progress Bar */}
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: '100%' }]} />
                    </View>
                </View>

                {/* Summary Card */}
                <View style={styles.summaryCard}>
                    {/* Destination Header */}
                    <View style={styles.destinationHeader}>
                        <View style={styles.destinationIcon}>
                            <MaterialIcons name="place" size={28} color="#1C4E80" />
                        </View>
                        <View style={styles.destinationInfo}>
                            <Text style={styles.destinationName}>{destination}</Text>
                            <Text style={styles.dateRange}>
                                {startDate} - {endDate}
                            </Text>
                        </View>
                    </View>

                    {/* Flight Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="flight" size={20} color="#1C4E80" />
                            <Text style={styles.sectionTitle}>Flight</Text>
                        </View>
                        <View style={styles.sectionContent}>
                            {/* Outbound Flight */}
                            <Text style={styles.flightSubsectionTitle}>Outbound</Text>
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
                            
                            {/* Return Flight */}
                            {endDate && (
                                <>
                                    <View style={styles.divider} />
                                    <Text style={styles.flightSubsectionTitle}>Return</Text>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Flight:</Text>
                                        <Text style={styles.infoValue}>{flightInfo.returnFlightNumber}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Departure:</Text>
                                        <Text style={styles.infoValue}>{flightInfo.returnDeparture}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Arrival:</Text>
                                        <Text style={styles.infoValue}>{flightInfo.returnArrival}</Text>
                                    </View>
                                </>
                            )}
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
                                <Text style={styles.infoLabel}>Type:</Text>
                                <Text style={styles.infoValue}>{typeof accommodation === 'string' ? accommodation : String(accommodation || 'Hotel')}</Text>
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

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Cost Summary */}
                    <View style={styles.costSection}>
                        <View style={styles.costRow}>
                            <Text style={styles.costLabel}>Total Cost:</Text>
                            <Text style={styles.totalCost}>${totalCost.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Spacer for button */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Done Button */}
            <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 16 }]}>
                <Pressable style={styles.doneButton} onPress={handleDone}>
                    <Text style={styles.doneButtonText}>Done</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
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
        alignItems: 'center',
    },
    successIconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1E1E1E',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6C6C6C',
        fontWeight: '400',
        marginBottom: 16,
        textAlign: 'center',
    },
    progressBarContainer: {
        width: '100%',
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
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
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
        marginBottom: 24,
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
    flightSubsectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C4E80',
        marginTop: 8,
        marginBottom: 4,
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
    buttonContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        backgroundColor: '#F6F8FC',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    doneButton: {
        backgroundColor: '#1C4E80',
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#1C4E80',
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    doneButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
});

