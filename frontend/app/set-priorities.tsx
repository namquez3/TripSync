import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PriorityType = 'budget' | 'travelStyle' | 'planning';

interface PrioritySliderProps {
    title: string;
    subtitle: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    iconColor: string;
    leftLabel: string;
    rightLabel: string;
    value: number;
    onValueChange: (value: number) => void;
}

function PrioritySlider({
    title,
    subtitle,
    icon,
    iconColor,
    leftLabel,
    rightLabel,
    value,
    onValueChange,
  }: PrioritySliderProps) {
    const sliderWidth = 300;
    const thumbSize = 24;
    const thumbRadius = thumbSize / 2;
  
    const position = useSharedValue((value / 100) * sliderWidth);
    const startPosition = useSharedValue(0);
  
    React.useEffect(() => {
      position.value = (value / 100) * sliderWidth;
    }, [value]);
  
    const updateValue = (pos: number) => {
      const clampedPos = Math.max(0, Math.min(sliderWidth, pos));
      const newValue = Math.round((clampedPos / sliderWidth) * 100);
      onValueChange(newValue);
    };
  
    const pan = Gesture.Pan()
      .onStart((e) => {
        'worklet';
        // if user taps somewhere on the track, jump thumb there
        const tappedX = e.x; // position within the track
        startPosition.value = tappedX;
        position.value = Math.max(0, Math.min(sliderWidth, tappedX));
      })
      .onUpdate((e) => {
        'worklet';
        const newPosition = startPosition.value + e.translationX;
        position.value = Math.max(0, Math.min(sliderWidth, newPosition));
      })
      .onEnd(() => {
        'worklet';
        runOnJS(updateValue)(position.value);
      });
  
    const thumbStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: position.value - thumbRadius }],
      };
    });
  
    const fillStyle = useAnimatedStyle(() => {
      return {
        width: position.value,
      };
    });
  
    return (
      <View style={styles.priorityCard}>
        <View style={styles.priorityHeader}>
          <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
            <MaterialIcons name={icon} size={24} color="#1C4E80" />
          </View>
          <View style={styles.priorityTextContainer}>
            <Text style={styles.priorityTitle}>{title}</Text>
            <Text style={styles.prioritySubtitle}>{subtitle}</Text>
          </View>
        </View>
  
        <View style={styles.sliderContainer}>
          <GestureDetector gesture={pan}>
            <Animated.View style={styles.sliderTrack}>
              <Animated.View style={[styles.sliderFill, fillStyle]} />
              <Animated.View style={[styles.sliderThumb, thumbStyle]} />
            </Animated.View>
          </GestureDetector>
        </View>
  
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>{leftLabel}</Text>
          <Text style={styles.sliderValue}>{value}%</Text>
          <Text style={styles.sliderLabel}>{rightLabel}</Text>
        </View>
      </View>
    );
  }
  

export default function SetPrioritiesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const [budget, setBudget] = useState(50);
    const [travelStyle, setTravelStyle] = useState(50);
    const [planning, setPlanning] = useState(50);

    // Get trip details from create-trip (passed via route params)
    const departureLocation = (params.departureLocation as string) || '';
    const destination = (params.destination as string) || '';
    const startDate = (params.startDate as string) || '';
    const endDate = (params.endDate as string) || '';

    const handleFindMatches = () => {
        router.push({
            pathname: '/best-matches',
            params: {
                budget: budget.toString(),
                travelStyle: travelStyle.toString(),
                planning: planning.toString(),
                // Pass through trip details from create-trip
                departureLocation: departureLocation,
                destination: destination,
                startDate: startDate,
                endDate: endDate,
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
                    <Text style={styles.stepIndicator}>Step 2 of 4</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Set Your Priorities</Text>
                    <Text style={styles.subtitle}>
                        Help us find the perfect trip options for your group
                    </Text>
                </View>

                {/* Priority Sliders */}
                <View style={styles.prioritiesContainer}>
                    <PrioritySlider
                        title="Budget"
                        subtitle="Budget-friendly vs Luxury"
                        icon="attach-money"
                        iconColor="#E3F2FD"
                        leftLabel="Budget"
                        rightLabel="Luxury"
                        value={budget}
                        onValueChange={setBudget}
                    />

                    <PrioritySlider
                        title="Travel Style"
                        subtitle="Fast & Direct vs Scenic & Relaxed"
                        icon="bolt"
                        iconColor="#FFF9C4"
                        leftLabel="Speed"
                        rightLabel="Comfort"
                        value={travelStyle}
                        onValueChange={setTravelStyle}
                    />

                    <PrioritySlider
                        title="Planning"
                        subtitle="Flexible Dates vs Fixed Schedule"
                        icon="track-changes"
                        iconColor="#FFE0E0"
                        leftLabel="Flexible"
                        rightLabel="Certain"
                        value={planning}
                        onValueChange={setPlanning}
                    />
                </View>

                {/* Spacer for button */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Find Matches Button */}
            <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 16 }]}>
                <Pressable style={styles.findMatchesButton} onPress={handleFindMatches}>
                    <Text style={styles.findMatchesButtonText}>Find Matches</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="white" />
                </Pressable>
            </View>
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
    },
    prioritiesContainer: {
        gap: 24,
    },
    priorityCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    priorityHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    priorityTextContainer: {
        flex: 1,
    },
    priorityTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1E1E1E',
        marginBottom: 4,
    },
    prioritySubtitle: {
        fontSize: 14,
        color: '#6C6C6C',
        fontWeight: '400',
    },
    sliderContainer: {
        marginBottom: 12,
        paddingVertical: 10,
    },
    sliderTrack: {
        width: 300,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        position: 'relative',
        alignSelf: 'center',
    },
    sliderFill: {
        height: 4,
        backgroundColor: '#1C4E80',
        borderRadius: 2,
        position: 'absolute',
        left: 0,
        top: 0,
    },
    sliderThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#1C4E80',
        position: 'absolute',
        top: -10,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    sliderLabel: {
        fontSize: 14,
        color: '#6C6C6C',
        fontWeight: '400',
    },
    sliderValue: {
        fontSize: 14,
        color: '#1C4E80',
        fontWeight: '600',
    },
    buttonContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    findMatchesButton: {
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
    findMatchesButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
});

