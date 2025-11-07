import { Image } from 'expo-image';
import React from 'react';
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

type TripCardProps = { title: string; date: string; image: any };

function TripCard({ title, date, image }: TripCardProps) {
  return (
    <View style={styles.card}>
      <Image source={image} style={styles.cardImage} contentFit="cover" />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDate}>{date}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header />

        <Text style={styles.sectionTitle}>Your Trips</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tripsRow}
        >
          <TripCard
            title="Bali, Indonesia"
            date="Dec 15-22, 2025"
            image={require('@/assets/images/react-logo.png')}
          />
          <View style={{ width: 16 }} />
          <TripCard
            title="Paris, France"
            date="Jan 10-14, 2026"
            image={require('@/assets/images/react-logo.png')}
          />
        </ScrollView>
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.ctaContainer}>
        <Pressable style={styles.ctaButton} onPress={() => {}}>
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
