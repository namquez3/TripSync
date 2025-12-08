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

const getTimeZone = (location: string): { tz: string; offset: number } => {
    const loc = location.toLowerCase();
    if (loc.includes('beijing') || loc.includes('shanghai') || loc.includes('china')) return { tz: 'CST', offset: 8 };
    if (loc.includes('tokyo') || loc.includes('japan')) return { tz: 'JST', offset: 9 };
    if (loc.includes('seoul') || loc.includes('korea')) return { tz: 'KST', offset: 9 };
    if (loc.includes('singapore') || loc.includes('malaysia')) return { tz: 'SGT', offset: 8 };
    if (loc.includes('bangkok') || loc.includes('thailand')) return { tz: 'ICT', offset: 7 };
    if (loc.includes('mumbai') || loc.includes('delhi') || loc.includes('india')) return { tz: 'IST', offset: 5.5 };
    if (loc.includes('sydney') || loc.includes('melbourne') || loc.includes('australia')) return { tz: 'AEST', offset: 10 };
    if (loc.includes('dubai') || loc.includes('uae') || loc.includes('qatar')) return { tz: 'GST', offset: 4 };
    if (loc.includes('london') || loc.includes('uk') || loc.includes('united kingdom')) return { tz: 'GMT', offset: 0 };
    if (loc.includes('paris') || loc.includes('rome') || loc.includes('berlin') || loc.includes('madrid') || loc.includes('europe') || loc.includes('santorini') || loc.includes('greece')) return { tz: 'CET', offset: 1 };
    if (loc.includes('moscow') || loc.includes('russia')) return { tz: 'MSK', offset: 3 };
    if (loc.includes('new york') || loc.includes('philadelphia') || loc.includes('boston') || loc.includes('washington') || loc.includes('miami') || loc.includes('atlanta')) return { tz: 'EST', offset: -5 };
    if (loc.includes('chicago') || loc.includes('dallas') || loc.includes('houston') || loc.includes('minneapolis')) return { tz: 'CST', offset: -6 };
    if (loc.includes('denver') || loc.includes('phoenix') || loc.includes('salt lake')) return { tz: 'MST', offset: -7 };
    if (loc.includes('los angeles') || loc.includes('san francisco') || loc.includes('seattle') || loc.includes('portland') || loc.includes('vegas') || loc.includes('las vegas')) return { tz: 'PST', offset: -8 };
    if (loc.includes('toronto') || loc.includes('montreal') || loc.includes('vancouver') || loc.includes('canada')) return { tz: 'EST', offset: -5 };
    if (loc.includes('mexico') || loc.includes('cancun')) return { tz: 'CST', offset: -6 };
    if (loc.includes('brazil') || loc.includes('sao paulo') || loc.includes('rio')) return { tz: 'BRT', offset: -3 };
    if (loc.includes('bali') || loc.includes('jakarta') || loc.includes('indonesia')) return { tz: 'WIB', offset: 7 };
    if (loc.includes('philippines') || loc.includes('manila')) return { tz: 'PHT', offset: 8 };
    return { tz: 'UTC', offset: 0 };
};

const getFlightDuration = (origin: string, destination: string): number => {
    const originLower = origin.toLowerCase();
    const destLower = destination.toLowerCase();
    
    const extractCity = (loc: string) => {
        const parts = loc.split(',').map(p => p.trim().toLowerCase());
        return parts[0];
    };
    
    const originCity = extractCity(origin);
    const destCity = extractCity(destination);
    
    const isUS = (loc: string) => {
        return loc.includes('united states') || loc.includes('usa') || loc.includes('us,') ||
               loc.includes('new york') || loc.includes('los angeles') || loc.includes('chicago') ||
               loc.includes('philadelphia') || loc.includes('miami') || loc.includes('atlanta') ||
               loc.includes('boston') || loc.includes('washington') || loc.includes('seattle') ||
               loc.includes('san francisco') || loc.includes('dallas') || loc.includes('houston') ||
               loc.includes('vegas') || loc.includes('las vegas') || loc.includes('phoenix') ||
               loc.includes('denver') || loc.includes('portland');
    };
    
    const isEurope = (loc: string) => {
        return loc.includes('europe') || loc.includes('london') || loc.includes('paris') ||
               loc.includes('rome') || loc.includes('berlin') || loc.includes('madrid') ||
               loc.includes('barcelona') || loc.includes('amsterdam') || loc.includes('vienna') ||
               loc.includes('santorini') || loc.includes('greece');
    };
    
    const isAsia = (loc: string) => {
        return loc.includes('asia') || loc.includes('tokyo') || loc.includes('japan') ||
               loc.includes('beijing') || loc.includes('shanghai') || loc.includes('china') ||
               loc.includes('seoul') || loc.includes('korea') || loc.includes('singapore') ||
               loc.includes('bangkok') || loc.includes('thailand') || loc.includes('mumbai') ||
               loc.includes('delhi') || loc.includes('india') || loc.includes('bali') ||
               loc.includes('indonesia') || loc.includes('philippines') || loc.includes('manila');
    };
    
    const isMiddleEast = (loc: string) => {
        return loc.includes('dubai') || loc.includes('uae') || loc.includes('qatar') ||
               loc.includes('abu dhabi') || loc.includes('riyadh') || loc.includes('saudi');
    };
    
    const isOceania = (loc: string) => {
        return loc.includes('australia') || loc.includes('sydney') || loc.includes('melbourne') ||
               loc.includes('auckland') || loc.includes('new zealand');
    };
    
    const isSouthAmerica = (loc: string) => {
        return loc.includes('south america') || loc.includes('brazil') || loc.includes('sao paulo') ||
               loc.includes('rio') || loc.includes('buenos aires') || loc.includes('argentina') ||
               loc.includes('lima') || loc.includes('peru') || loc.includes('bogota') || loc.includes('colombia');
    };
    
    const originUS = isUS(originLower);
    const destUS = isUS(destLower);
    const originEurope = isEurope(originLower);
    const destEurope = isEurope(destLower);
    const originAsia = isAsia(originLower);
    const destAsia = isAsia(destLower);
    const originMiddleEast = isMiddleEast(originLower);
    const destMiddleEast = isMiddleEast(destLower);
    const originOceania = isOceania(originLower);
    const destOceania = isOceania(destLower);
    const originSouthAmerica = isSouthAmerica(originLower);
    const destSouthAmerica = isSouthAmerica(destLower);
    
    if (originUS && destUS) {
        if (originCity.includes('new york') || originCity.includes('philadelphia') || originCity.includes('boston')) {
            if (destCity.includes('los angeles') || destCity.includes('san francisco') || destCity.includes('seattle')) return 6;
            if (destCity.includes('miami') || destCity.includes('atlanta')) return 2.5;
        }
        if (originCity.includes('los angeles') || originCity.includes('san francisco')) {
            if (destCity.includes('new york') || destCity.includes('philadelphia') || destCity.includes('boston')) return 5.5;
            if (destCity.includes('chicago') || destCity.includes('dallas')) return 3.5;
        }
        return 3;
    }
    
    if (originUS && destEurope) {
        if (originCity.includes('new york') || originCity.includes('philadelphia') || originCity.includes('boston')) return 7;
        if (originCity.includes('chicago') || originCity.includes('atlanta')) return 8.5;
        if (originCity.includes('los angeles') || originCity.includes('san francisco')) return 11;
        return 9;
    }
    
    if (originUS && destAsia) {
        if (destCity.includes('beijing') || destCity.includes('shanghai') || destCity.includes('china')) {
            if (originCity.includes('new york') || originCity.includes('philadelphia') || originCity.includes('boston')) return 14;
            if (originCity.includes('chicago') || originCity.includes('atlanta')) return 15;
            if (originCity.includes('los angeles') || originCity.includes('san francisco')) return 12.5;
            return 13.5;
        }
        if (destCity.includes('tokyo') || destCity.includes('japan')) {
            if (originCity.includes('new york') || originCity.includes('philadelphia') || originCity.includes('boston')) return 14;
            if (originCity.includes('chicago') || originCity.includes('atlanta')) return 13;
            if (originCity.includes('los angeles') || originCity.includes('san francisco')) return 11;
            return 12;
        }
        if (destCity.includes('seoul') || destCity.includes('korea')) {
            if (originCity.includes('new york') || originCity.includes('philadelphia') || originCity.includes('boston')) return 14.5;
            if (originCity.includes('los angeles') || originCity.includes('san francisco')) return 12.5;
            return 13.5;
        }
        if (destCity.includes('singapore')) {
            if (originCity.includes('new york') || originCity.includes('philadelphia') || originCity.includes('boston')) return 18;
            if (originCity.includes('los angeles') || originCity.includes('san francisco')) return 16;
            return 17;
        }
        if (destCity.includes('bali') || destCity.includes('indonesia')) {
            if (originCity.includes('new york') || originCity.includes('philadelphia') || originCity.includes('boston')) return 20;
            if (originCity.includes('los angeles') || originCity.includes('san francisco')) return 18;
            return 19;
        }
        return 14;
    }
    
    if (originUS && destMiddleEast) {
        if (originCity.includes('new york') || originCity.includes('philadelphia') || originCity.includes('boston')) return 12;
        if (originCity.includes('chicago') || originCity.includes('atlanta')) return 13.5;
        if (originCity.includes('los angeles') || originCity.includes('san francisco')) return 16;
        return 13;
    }
    
    if (originUS && destOceania) {
        if (originCity.includes('los angeles') || originCity.includes('san francisco')) return 14;
        if (originCity.includes('new york') || originCity.includes('philadelphia') || originCity.includes('boston')) return 22;
        return 18;
    }
    
    if (originEurope && destAsia) {
        if (destCity.includes('beijing') || destCity.includes('shanghai') || destCity.includes('china')) return 10;
        if (destCity.includes('tokyo') || destCity.includes('japan')) return 11;
        if (destCity.includes('singapore')) return 12;
        return 10.5;
    }
    
    if (originEurope && destUS) {
        if (destCity.includes('new york') || destCity.includes('philadelphia') || destCity.includes('boston')) return 7.5;
        if (destCity.includes('chicago') || destCity.includes('atlanta')) return 9;
        if (destCity.includes('los angeles') || originCity.includes('san francisco')) return 11;
        return 9;
    }
    
    if (originAsia && destAsia) {
        if (originCity.includes('beijing') || originCity.includes('shanghai')) {
            if (destCity.includes('tokyo') || destCity.includes('japan')) return 3;
            if (destCity.includes('singapore')) return 5.5;
            if (destCity.includes('bali') || destCity.includes('indonesia')) return 6;
        }
        return 4;
    }
    
    return 8;
};

const calculateFlightTimes = (origin: string, destination: string, departureHour: number = 9): {
    departureTime: string;
    arrivalTimeLocal: string;
    flightDuration: number;
    originTZ: string;
    destTZ: string;
    arrivalDaysOffset: number;
} => {
    const flightDuration = getFlightDuration(origin, destination);
    const originTZInfo = getTimeZone(origin);
    const destTZInfo = getTimeZone(destination);
    const originTZ = originTZInfo.tz;
    const destTZ = destTZInfo.tz;
    
    const timeZoneDiff = destTZInfo.offset - originTZInfo.offset;
    
    const formatTime = (hours: number, tz: string, addDays: number = 0): string => {
        let totalHours = hours;
        if (totalHours >= 24) {
            addDays += Math.floor(totalHours / 24);
            totalHours = totalHours % 24;
        }
        if (totalHours < 0) {
            addDays -= 1;
            totalHours = 24 + totalHours;
        }
        
        const hour = Math.floor(totalHours) % 24;
        const minutes = Math.floor((totalHours % 1) * 60);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        const daySuffix = addDays > 0 ? '+1' : (addDays < 0 ? '-1' : '');
        return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period} ${tz}${daySuffix}`;
    };
    
    const departureTime = formatTime(departureHour, originTZ);
    
    const arrivalHoursInOriginTZ = departureHour + flightDuration;
    const arrivalHoursInDestTZ = arrivalHoursInOriginTZ + timeZoneDiff;
    
    let arrivalDays = 0;
    if (arrivalHoursInDestTZ >= 24) {
        arrivalDays = Math.floor(arrivalHoursInDestTZ / 24);
    }
    
    const arrivalTimeLocal = formatTime(arrivalHoursInDestTZ, destTZ, arrivalDays);
    
    return {
        departureTime,
        arrivalTimeLocal,
        flightDuration,
        originTZ,
        destTZ,
        arrivalDaysOffset: arrivalDays,
    };
};

const calculateArrivalDate = (startDate: string, daysOffset: number): string => {
    if (!startDate || !startDate.includes('/')) return '';
    try {
        const [month, day, year] = startDate.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + daysOffset);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[date.getMonth()];
        return `${monthName} ${date.getDate()}, ${date.getFullYear()}`;
    } catch {
        return startDate;
    }
};

const getDefaultAirline = (dest: string): string => {
    const destLower = dest.toLowerCase();
    if (destLower.includes('miami') || destLower.includes('florida') || destLower.includes('united states') || destLower.includes('usa')) {
        return 'American Airlines';
    } else if (destLower.includes('europe') || destLower.includes('london') || destLower.includes('paris') || destLower.includes('rome') || destLower.includes('barcelona') || destLower.includes('santorini') || destLower.includes('greece')) {
        return 'Lufthansa';
    } else if (destLower.includes('asia') || destLower.includes('tokyo') || destLower.includes('japan') || destLower.includes('singapore') || destLower.includes('beijing') || destLower.includes('china') || destLower.includes('seoul') || destLower.includes('korea')) {
        return 'United Airlines';
    } else if (destLower.includes('australia') || destLower.includes('sydney') || destLower.includes('melbourne')) {
        return 'Qantas';
    } else if (destLower.includes('canada') || destLower.includes('toronto') || destLower.includes('vancouver')) {
        return 'Air Canada';
    } else if (destLower.includes('mexico') || destLower.includes('cancun') || destLower.includes('mexico city')) {
        return 'Aeromexico';
    } else if (destLower.includes('brazil') || destLower.includes('south america')) {
        return 'LATAM Airlines';
    } else if (destLower.includes('dubai') || destLower.includes('uae') || destLower.includes('qatar')) {
        return 'Emirates';
    } else if (destLower.includes('bali') || destLower.includes('indonesia')) {
        return 'Singapore Airlines';
    }
    return 'American Airlines';
};

const getFlightInfo = (origin: string, destination: string, duration: number, startDate?: string, endDate?: string) => {
    if (!origin || origin.trim() === '') {
        origin = 'New York, United States';
    }
    
    const outbound = calculateFlightTimes(origin, destination, 9);
    const returnFlight = calculateFlightTimes(destination, origin, 14);
    
    const airline = getDefaultAirline(destination);
    const flightNumber = airline === 'American Airlines' ? 'AA 1234' : 
                        airline === 'Lufthansa' ? 'LH 456' :
                        airline === 'United Airlines' ? 'UA 789' :
                        airline === 'Qantas' ? 'QF 12' :
                        airline === 'Air Canada' ? 'AC 123' :
                        airline === 'Aeromexico' ? 'AM 456' :
                        airline === 'LATAM Airlines' ? 'LA 789' :
                        airline === 'Emirates' ? 'EK 201' :
                        airline === 'Singapore Airlines' ? 'SQ 892' : 'AA 1234';
    
    const returnFlightNumber = airline === 'American Airlines' ? 'AA 1235' : 
                               airline === 'Lufthansa' ? 'LH 457' :
                               airline === 'United Airlines' ? 'UA 790' :
                               airline === 'Qantas' ? 'QF 13' :
                               airline === 'Air Canada' ? 'AC 124' :
                               airline === 'Aeromexico' ? 'AM 457' :
                               airline === 'LATAM Airlines' ? 'LA 790' :
                               airline === 'Emirates' ? 'EK 202' :
                               airline === 'Singapore Airlines' ? 'SQ 893' : 'AA 1235';
    
    const departureDate = startDate ? formatFlightDate(startDate) : '';
    const arrivalDate = startDate ? calculateArrivalDate(startDate, outbound.arrivalDaysOffset) : '';
    const returnDate = endDate ? formatFlightDate(endDate) : '';
    const returnArrivalDate = endDate ? calculateArrivalDate(endDate, returnFlight.arrivalDaysOffset) : '';
    
    const arrivalDisplay = outbound.arrivalTimeLocal;
    const returnDepartureDisplay = returnFlight.departureTime;
    const returnArrivalDisplay = returnFlight.arrivalTimeLocal;
    
    return {
        airline,
        flightNumber,
        departure: startDate ? `${outbound.departureTime}, ${departureDate}` : outbound.departureTime,
        arrival: startDate ? `${arrivalDisplay}, ${arrivalDate}` : arrivalDisplay,
        returnFlightNumber,
        returnDeparture: endDate ? `${returnDepartureDisplay}, ${returnDate}` : returnDepartureDisplay,
        returnArrival: endDate ? `${returnArrivalDisplay}, ${returnArrivalDate}` : returnArrivalDisplay,
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

    const flightInfo = getFlightInfo(departureLocation || 'New York, United States', destination, duration, startDate, endDate);
    const accommodationStr = typeof accommodation === 'string' 
        ? accommodation 
        : (accommodation && typeof accommodation === 'object' 
            ? String(accommodation) 
            : String(accommodation || 'Hotel'));
    const hotelInfo = getHotelInfo(destination, accommodationStr);

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
        router.push('/(tabs)');
    };

    // Generate booking URLs
    const getFlightBookingUrl = () => {
        const formatDateForUrl = (dateStr: string) => {
            if (!dateStr || !dateStr.includes('/')) return '';
            const [month, day, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        };
        
        const formattedStartDate = formatDateForUrl(startDate);
        const formattedEndDate = formatDateForUrl(endDate);
        const origin = departureLocation || '';
        const dest = destination.trim();
        
        if (origin && formattedStartDate && formattedEndDate) {
            return `https://www.google.com/travel/flights?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(dest)}%20${formattedStartDate}%20returning%20${formattedEndDate}`;
        } else if (origin && formattedStartDate) {
            return `https://www.google.com/travel/flights?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(dest)}%20on%20${formattedStartDate}`;
        } else if (formattedStartDate) {
            return `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(dest)}%20on%20${formattedStartDate}`;
        } else if (origin) {
            return `https://www.google.com/travel/flights?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(dest)}`;
        }
        return `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(dest)}`;
    };

    const getHotelBookingUrl = () => {
        const formatDateForUrl = (dateStr: string) => {
            if (!dateStr || !dateStr.includes('/')) return '';
            const [month, day, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        };
        
        const checkin = formatDateForUrl(startDate);
        const checkout = formatDateForUrl(endDate);
        const dest = destination.trim();
        
        const hotelSearchQuery = dest;
        
        const params = new URLSearchParams({
            ss: hotelSearchQuery,
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

