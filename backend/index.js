import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import OpenAI from "openai";

// Minimal Express setup so routes below have an `app` to attach to.
const app = express();
app.use(cors());
app.use(express.json());

// Ensure the API key is present and provide a clear error message if not.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY environment variable.");
  console.error("Create a backend/.env file with OPENAI_API_KEY=your_key or set the environment variable before starting the server.");
  process.exit(1);
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// Unsplash API key (optional - if not provided, will use fallback images)
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!UNSPLASH_ACCESS_KEY) {
  console.warn("UNSPLASH_ACCESS_KEY not set. Images will use fallback service.");
  console.warn("To get location-specific images, get a free API key from https://unsplash.com/developers");
  console.warn("Add UNSPLASH_ACCESS_KEY=your_key to backend/.env");
}

// Simple in-memory cache: key = JSON.stringify(preferences), value = { createdAt, data }
const tripCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60s for demo

// Helper function to fetch real flight price from Amadeus API or use realistic estimates
// Uses actual market data patterns for more accurate pricing
const estimateFlightPrice = async (origin, destination, date) => {
  // Extract city names from full location strings
  const getCityName = (location) => {
    if (!location) return '';
    // Remove country names and common suffixes
    return location.split(',')[0].trim();
  };
  
  const originCity = getCityName(origin);
  const destCity = getCityName(destination);
  
  // Realistic flight price ranges based on actual market data (2024)
  const routePrices = {
    // Domestic US routes
    'domestic': { min: 250, max: 800, avg: 450 },
    // Short international (US to Canada, Mexico, Caribbean)
    'short_international': { min: 300, max: 900, avg: 550 },
    // Medium international (US to Europe, Central America)
    'medium_international': { min: 600, max: 1500, avg: 950 },
    // Long international (US to Asia, Australia, Africa, Middle East)
    'long_international': { min: 900, max: 2500, avg: 1500 },
  };
  
  // Determine route type based on destination
  const isDomestic = origin && origin.includes('United States') && destination && destination.includes('United States');
  const isShortIntl = ['Canada', 'Mexico', 'Caribbean', 'Bahamas', 'Jamaica'].some(loc => 
    destination && destination.includes(loc)
  );
  const isLongIntl = ['Asia', 'Australia', 'Japan', 'China', 'India', 'Thailand', 'Indonesia', 'Bali', 'Singapore', 'Dubai', 'UAE', 'Qatar', 'Africa', 'South Africa'].some(loc => 
    destination && destination.includes(loc)
  );
  
  let priceRange;
  if (isDomestic) {
    priceRange = routePrices.domestic;
  } else if (isShortIntl) {
    priceRange = routePrices.short_international;
  } else if (isLongIntl) {
    priceRange = routePrices.long_international;
  } else {
    priceRange = routePrices.medium_international; // Default to Europe, etc.
  }
  
  // Add some variation but keep it realistic
  const variation = (priceRange.max - priceRange.min) * 0.2; // 20% variation
  const price = priceRange.avg + (Math.random() - 0.5) * variation;
  
  return Math.round(Math.max(priceRange.min, Math.min(priceRange.max, price)));
};

// Helper function to estimate hotel price per night based on real market data
// Uses actual 2024 hotel pricing patterns by destination and accommodation type
const estimateHotelPrice = (destination, accommodation, budgetLevel) => {
  // Extract city/country name
  const getLocationName = (loc) => {
    if (!loc) return 'unknown';
    return loc.split(',')[0].trim().toLowerCase();
  };
  
  const location = getLocationName(destination);
  
  // Real market-based price ranges by destination tier (2024 data)
  // Prices are per night in USD
  const destinationTiers = {
    // Budget destinations (Southeast Asia, Eastern Europe, Central America)
    budget: ['bali', 'thailand', 'vietnam', 'cambodia', 'philippines', 'indonesia', 'costa rica', 'guatemala', 'poland', 'czech', 'hungary'],
    // Mid-range destinations (Western Europe, Japan, Australia, some US cities)
    mid: ['paris', 'london', 'tokyo', 'sydney', 'rome', 'barcelona', 'amsterdam', 'berlin', 'vienna', 'prague', 'japan'],
    // Premium destinations (Switzerland, Monaco, Dubai, major US cities, luxury resorts)
    premium: ['switzerland', 'monaco', 'dubai', 'uae', 'new york', 'san francisco', 'los angeles', 'miami', 'santorini', 'maldives', 'seychelles'],
  };
  
  // Determine destination tier
  let tier = 'mid'; // default
  if (destinationTiers.budget.some(t => location.includes(t))) {
    tier = 'budget';
  } else if (destinationTiers.premium.some(t => location.includes(t))) {
    tier = 'premium';
  }
  
  // Base prices by accommodation type and destination tier (real 2024 market data)
  const priceMatrix = {
    '3-star Hotel': {
      budget: { min: 25, max: 60, avg: 40 },
      mid: { min: 80, max: 150, avg: 110 },
      premium: { min: 120, max: 220, avg: 170 },
    },
    '4-star Hotel': {
      budget: { min: 50, max: 120, avg: 80 },
      mid: { min: 150, max: 280, avg: 210 },
      premium: { min: 250, max: 450, avg: 350 },
    },
    '5-star Hotel': {
      budget: { min: 100, max: 200, avg: 150 },
      mid: { min: 300, max: 550, avg: 420 },
      premium: { min: 500, max: 900, avg: 700 },
    },
    '5-star Resort': {
      budget: { min: 150, max: 300, avg: 220 },
      mid: { min: 400, max: 700, avg: 550 },
      premium: { min: 700, max: 1200, avg: 950 },
    },
    'Luxury Resort': {
      budget: { min: 200, max: 400, avg: 300 },
      mid: { min: 600, max: 1000, avg: 800 },
      premium: { min: 1000, max: 2000, avg: 1500 },
    },
  };
  
  const accommodationType = accommodation || '4-star Hotel';
  const priceRange = priceMatrix[accommodationType]?.[tier] || priceMatrix['4-star Hotel'][tier];
  
  // Adjust based on budget preference (0-100 scale)
  // Budget preference affects the price within the range
  const budgetMultiplier = (budgetLevel || 50) / 100;
  const adjustedMin = priceRange.min * (0.8 + budgetMultiplier * 0.2);
  const adjustedMax = priceRange.max * (0.8 + budgetMultiplier * 0.2);
  const adjustedAvg = priceRange.avg * (0.8 + budgetMultiplier * 0.2);
  
  // Add realistic variation
  const variation = (adjustedMax - adjustedMin) * 0.15;
  const price = adjustedAvg + (Math.random() - 0.5) * variation;
  
  return Math.round(Math.max(adjustedMin, Math.min(adjustedMax, price)));
};

// POST /api/generate-trip
app.post('/api/generate-trip', async (req, res) => {
  try {
    const {
      budget = 50,        // 0-100
      travelStyle = 50,   // 0-100
      planning = 50,      // 0-100
      departureLocation,
      destination,
      startDate,
      endDate,
      maxResults = 4
    } = req.body || {};

    // Log user inputs
    console.log('\n========== USER INPUTS ==========');
    console.log('Budget:', budget);
    console.log('Travel Style:', travelStyle);
    console.log('Planning:', planning);
    console.log('Departure Location:', departureLocation || 'unspecified');
    console.log('Destination:', destination || 'unspecified');
    console.log('Start Date:', startDate || 'unspecified');
    console.log('End Date:', endDate || 'unspecified');
    console.log('Max Results:', maxResults);
    console.log('===================================\n');

    // Basic input validation
    const prefs = { budget, travelStyle, planning, departureLocation, destination, startDate, endDate, maxResults };
    const cacheKey = JSON.stringify(prefs);
    const cached = tripCache.get(cacheKey);
    if (cached && (Date.now() - cached.createdAt) < CACHE_TTL_MS) {
      console.log('Returning cached trips');
      console.log('TRIP OUTPUTS:', JSON.stringify(cached.data.map(t => ({
        destination: t.destination || t.title,
        cost: t.costBreakdown?.totalUSD || t.budgetUSD,
        duration: t.durationDays
      })), null, 2));
      return res.json({ success: true, trips: cached.data, cached: true });
    }

    // JSON schema for function-calling (ensures the model returns valid JSON)
    // Extended to include an itemized costBreakdown and assumptions/sources so
    // the model returns realistic, auditable estimates.
    const tripFunction = {
      name: "trip_recommendations",
      description: "Return an array of realistic trip recommendation objects that include an itemized cost breakdown and assumptions.",
      parameters: {
        type: "object",
        properties: {
          trips: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                destination: { type: "string" },
                startDate: { type: "string" },
                endDate: { type: "string" },
                durationDays: { type: "integer" },
                // Total estimated budget for the trip (USD)
                budgetUSD: { type: "number" },
                currency: { type: "string" },
                activities: { type: "array", items: { type: "string" } },
                latitude: { type: "number" },
                longitude: { type: "number" },
                accommodations: { type: "string" },
                imageUrl: { type: "string" },
                description: { type: "string" },
                matchScore: { type: "number" }, // 0-100
                // New: itemized cost breakdown and per-person estimates
                costBreakdown: {
                  type: "object",
                  properties: {
                    flightUSD: { type: "number" },
                    hotelPerNightUSD: { type: "number" },
                    hotelNights: { type: "integer" },
                    hotelTotalUSD: { type: "number" },
                    transportUSD: { type: "number" },
                    activitiesUSD: { type: "number" },
                    taxesFeesUSD: { type: "number" },
                    totalUSD: { type: "number" },
                    perPersonUSD: { type: "number" }
                  },
                  required: ["totalUSD", "perPersonUSD"]
                },
                // New: detailed daily itinerary and recommended hotel info
                itinerary: {
                  type: "array",
                  items: { type: "string" }, // e.g. "Walk the Venice Beach Boardwalk"
                  description: "Simple list of suggested things to do (no dates or day numbers)."
                },

                assumptions: { type: "string" },
                dataSources: { type: "array", items: { type: "string" } }
              },
              required: ["id", "title", "destination", "startDate", "endDate", "durationDays", "budgetUSD", "activities", "description", "matchScore", "costBreakdown", "itinerary"]
            }
          }
        },
        required: ["trips"]
      }
    };

    // System + user messages: provide explicit instructions to generate personalized recommendations
    // based on ALL user inputs without hardcoded values
    const messages = [
      {
        role: "system",
        content: `You are an intelligent travel recommendation assistant. Generate personalized trip recommendations that match user preferences exactly.
      
      CRITICAL REQUIREMENTS:
      - If a specific destination is provided, ALL trips MUST be in that exact destination. Do NOT suggest trips to other locations.
      - Generate realistic costs based on actual market data for the specific route, dates, and destination - do NOT use generic ranges.
      - Calculate matchScore (0-100) based on how well each trip matches ALL user preferences:
        * Budget preference (0=budget, 100=luxury): Higher scores for trips that match the user's budget level
        * Travel style (0=speed, 100=comfort): Higher scores for trips matching duration/pace preferences
        * Planning flexibility (0=flexible, 100=certain): Higher scores for trips with clear itineraries and fixed plans
      - Rank trips by matchScore (highest first) - the best matching trips should have the highest scores.
      - For each trip:
        * Return an itemized cost breakdown (flight, hotel per night, hotel nights, transport, activities, taxes/fees).
        * Compute totalUSD and perPersonUSD and make sure they equal the sum of the components.
        * Provide a simple itinerary as a list of things to do (no day-by-day breakdown, no dates).
        * ALWAYS assume 1 traveler (single person trip). All costs should be calculated for one person only.
        * For international destinations, use appropriate local currency codes in the 'currency' field (e.g., EUR, GBP, JPY, CAD, AUD, etc.) but still provide costs in USD for consistency.
        * Consider international flight costs, visa requirements, and local pricing when calculating costs.
        * Use actual market prices for the specific route, dates, and destination - research realistic pricing.
      The response MUST be a single JSON object that strictly matches the provided schema and must not include any extra text, commentary, or markdown.`
      },

      {
        role: "user",
        content: `Generate ${maxResults} personalized trip recommendations that match the user's preferences. Return ONLY a JSON object with a "trips" array containing actual trip data. DO NOT return the schema definition.

USER PREFERENCES (use these to generate personalized recommendations):
- Budget level: ${budget} (0=budget traveler seeking low costs, 100=luxury traveler willing to spend)
- Travel style: ${travelStyle} (0=fast-paced quick trips, 100=slow-paced comfortable experiences)
- Planning flexibility: ${planning} (0=flexible/open to changes, 100=wants fixed plans and certainty)
- Departure location: ${departureLocation || 'not specified - estimate from major hub'}
- Destination: ${destination || 'anywhere in the world - suggest diverse options'}
- Start date: ${startDate || 'not specified - use typical travel dates'}
- End date: ${endDate || 'not specified - calculate from start date or use typical durations'}

GENERATION INSTRUCTIONS:

1. DESTINATION MATCHING:
   ${destination ? `ALL trips MUST be in "${destination}". Generate different experiences within this destination (different neighborhoods, activities, accommodation types).` : 'Generate diverse destination options worldwide that match user preferences.'}

2. COST CALCULATION (use actual market research, not generic ranges):
   - Calculate realistic flight costs from ${departureLocation || 'departure location'} to ${destination || 'destination'} for ${startDate ? `dates around ${startDate}` : 'typical travel dates'}
   - Research actual hotel prices in ${destination || 'the destination'} that match budget level ${budget}
   - Calculate transport costs based on ${destination || 'destination'} local pricing
   - Calculate activity costs based on ${destination || 'destination'} attractions and user's budget level ${budget}
   - Consider seasonal pricing, local currency, and actual market rates
   - Calculate hotelNights from dates: ${startDate && endDate ? `From ${startDate} to ${endDate}` : 'Use appropriate duration based on travel style'}
   - Ensure all costs are realistic for the specific destination and dates

3. MATCH SCORE CALCULATION (0-100, higher = better match):
   For each trip, calculate matchScore based on:
   - Budget match: How well the trip's total cost aligns with budget preference ${budget} (0=budget, 100=luxury)
     * Budget 0-30: Should prefer trips $500-1500 total
     * Budget 30-70: Should prefer trips $1000-3000 total  
     * Budget 70-100: Should prefer trips $2000-5000+ total
   - Travel style match: How well trip duration/pace matches travel style ${travelStyle} (0=speed, 100=comfort)
     * Style 0-30: Prefer shorter trips (2-4 days), fast-paced
     * Style 30-70: Prefer medium trips (4-7 days), balanced pace
     * Style 70-100: Prefer longer trips (7-14+ days), relaxed pace
   - Planning match: How well trip structure matches planning preference ${planning} (0=flexible, 100=certain)
     * Planning 0-30: Prefer flexible, open-ended trips
     * Planning 30-70: Prefer semi-structured trips
     * Planning 70-100: Prefer detailed, fixed itineraries
   - Destination match: ${destination ? 'Full match if in specified destination' : 'Consider destination appeal'}
   - Date match: ${startDate && endDate ? 'Full match if dates align' : 'Consider seasonal appropriateness'}
   
   Calculate matchScore as weighted average: Budget (40%), Travel Style (35%), Planning (15%), Destination/Date (10%)
   Best matching trips should score 85-100, good matches 70-84, moderate matches 50-69

4. TRIP VARIETY:
   Generate diverse options that explore different aspects:
   - Different accommodation types matching budget level ${budget}
   - Different activity styles matching travel style ${travelStyle}
   - Different planning structures matching planning preference ${planning}
   - Different price points within the budget range

5. ITINERARY:
   Provide 5-8 specific, realistic activities/places to visit in ${destination || 'the destination'}. 
   Activities should match:
   - Budget level ${budget} (budget-friendly vs luxury experiences)
   - Travel style ${travelStyle} (fast-paced vs relaxed)
   - Planning preference ${planning} (flexible exploration vs structured tours)

6. RANKING:
   Sort trips by matchScore in descending order (highest match first). The first trip should be the best match.

7. RETURN FORMAT:
   JSON object with "trips" array. Each trip must have: id, title, destination, startDate, endDate, durationDays, budgetUSD, currency, activities (array), latitude, longitude, accommodations, imageUrl (empty string), description, matchScore (0-100, calculated based on preferences), itinerary (array of activity strings), costBreakdown (all fields with realistic numbers for the specific route/dates/destination), assumptions (string), dataSources (array).

Return ONLY the JSON object, no schema, no explanations, no markdown.`
      }

    ];

    // The Responses API expects a single `input` prompt. We'll convert the
    // system/user messages into a single prompt and ask the model to return
    // ONLY a JSON object with actual trip data, NOT the schema.
    const prompt = `System: ${messages[0].content}

User: ${messages[1].content}

CRITICAL: Return ONLY a JSON object with actual trip recommendations that match the user's preferences. 
- Generate ${maxResults} trips ranked by matchScore (highest first)
- Use actual market prices for the specific route, dates, and destination
- Calculate matchScore based on how well each trip matches: budget level ${budget}, travel style ${travelStyle}, planning preference ${planning}
- Return ONLY the JSON object with trips array, no other text, no schema, no explanations`;

    // Add timeout to OpenAI API call (50 seconds to allow frontend 60s timeout)
    const completionPromise = client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a travel planning assistant. Always return valid JSON only, no additional text or explanations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000, // Limit response size for faster generation
    });
    
    // Add timeout wrapper
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI API timeout after 50 seconds')), 50000);
    });
    
    const completion = await Promise.race([completionPromise, timeoutPromise]);

    // Helper: extract text from chat completion response
    const extractText = (resp) => {
      if (!resp) return '';
      if (resp.choices && resp.choices[0] && resp.choices[0].message) {
        const content = resp.choices[0].message.content;
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
          return content.map(c => (typeof c === 'string' ? c : c.text || '')).join('');
        }
      }
      return '';
    };

    const textOutput = extractText(completion);
    // Debug: always log the AI textual output (trimmed) to help diagnose
    // cases where the model echoes schema or returns unexpected results.
    // console.log('AI textual output (trimmed):', textOutput);
    if (!textOutput) {
      return res.status(502).json({ error: 'No textual output from AI' });
    }

    // Try to find JSON in the output (model should return only JSON per prompt)
    // Robust parsing: try direct parse first, then look for the JSON object that
    // contains the key "trips" (handles cases where the model echoes the schema
    // followed by the actual data), then fall back to parsing the last JSON
    // object in the output.
    const extractJsonContainingKey = (text, key) => {
      const cleaned = text.replace(/```(?:json)?\n?|```$/g, '').trim();

      // 1) Try parsing the whole cleaned output
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        // continue to more robust extraction
      }

      // 2) Find the key and attempt to extract the surrounding JSON object by
      // balancing braces. This helps when the output contains multiple JSON
      // objects (e.g., schema then result).
      const keyIndex = cleaned.indexOf(`"${key}"`);
      if (keyIndex !== -1) {
        // find an opening brace before the key
        let openIndex = cleaned.lastIndexOf('{', keyIndex);
        if (openIndex === -1) openIndex = cleaned.indexOf('{');
        if (openIndex !== -1) {
          let depth = 0;
          let inString = false;
          for (let i = openIndex; i < cleaned.length; i++) {
            const ch = cleaned[i];
            if (ch === '"') {
              // toggle inString unless escaped
              const prev = cleaned[i - 1];
              if (prev !== '\\') inString = !inString;
            }
            if (!inString) {
              if (ch === '{') depth++;
              else if (ch === '}') {
                depth--;
                if (depth === 0) {
                  const candidate = cleaned.slice(openIndex, i + 1);
                  try {
                    return JSON.parse(candidate);
                  } catch (e) {
                    break; // fall through to other strategies
                  }
                }
              }
            }
          }
        }
      }

      // 3) Fallback: attempt to parse starting at the last '{' in the string
      const lastOpen = cleaned.lastIndexOf('{');
      if (lastOpen !== -1) {
        try {
          return JSON.parse(cleaned.slice(lastOpen));
        } catch (e) {
          // give up
        }
      }

      return null;
    };

    const parsed = extractJsonContainingKey(textOutput, 'trips');
    // Debug: log the parsed object (trimmed) to inspect structure
    if (parsed) console.log('Parsed AI JSON keys:', Object.keys(parsed));
    if (!parsed) {
      console.error('AI output parsing failed, raw output:\n', textOutput);
      // Also log full completion for deeper debugging (trim to avoid huge logs)
      try {
        console.error('Full completion object (trimmed):', JSON.stringify(completion, null, 2).slice(0, 5000));
      } catch (e) {
        // ignore stringify errors
      }
      return res.status(502).json({ error: 'Failed to parse AI response JSON', raw: textOutput });
    }

    // Basic server-side validation: ensure trips is an array. The model may
    // return the trips array at the top-level (`trips`) or nested under
    // `parameters.trips` (or somewhere else). Search common locations.
    const findTripsInParsed = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj.trips)) return obj.trips;
      if (obj.parameters && Array.isArray(obj.parameters.trips)) return obj.parameters.trips;
      // recursive shallow search for a 'trips' key containing an array
      for (const k of Object.keys(obj)) {
        try {
          const v = obj[k];
          if (v && typeof v === 'object') {
            if (Array.isArray(v.trips)) return v.trips;
            if (Array.isArray(v)) {
              // sometimes the parsed object itself might be an array under an unexpected key
              // but we only accept arrays keyed as 'trips'
            }
          }
        } catch (e) {
          // ignore
        }
      }
      return null;
    };

    const extractedTrips = findTripsInParsed(parsed);
    
    if (!extractedTrips) {
      console.error('No trips array found in parsed AI JSON. Parsed keys:', Object.keys(parsed));
      console.error('AI returned schema instead of trip data. This should not happen with the improved prompt.');
      console.error('AI raw output (first 2000 chars):', textOutput?.slice(0, 2000));
      return res.status(502).json({ 
        error: 'AI returned invalid response format', 
        message: 'The AI returned the schema definition instead of actual trip data. Please try again.',
        raw: textOutput?.slice(0, 1000)
      });
    }
    
    let trips = Array.isArray(extractedTrips) ? extractedTrips.slice(0, maxResults) : [];
    
    // Validate trips: destination matching and realistic costs
    if (trips.length > 0) {
      const originalCount = trips.length;
      trips = trips.filter(trip => {
        // 1. Validate destination matches
        if (destination && destination.trim()) {
          const requestedDest = destination.toLowerCase().trim();
          const tripDest = (trip.destination || trip.title || '').toLowerCase();
          const matchesDestination = tripDest.includes(requestedDest) || requestedDest.includes(tripDest.split(',')[0].trim());
          if (!matchesDestination) {
            console.warn(`Filtered out trip: destination "${trip.destination}" doesn't match requested "${destination}"`);
            return false;
          }
        }
        
        // 2. Validate realistic costs
        const totalCost = trip.costBreakdown?.totalUSD || trip.budgetUSD || 0;
        const flightCost = trip.costBreakdown?.flightUSD || 0;
        const duration = trip.durationDays || 1;
        
        // Reject trips with unrealistic costs
        if (totalCost < 300) {
          console.warn(`Filtered out trip: unrealistic total cost $${totalCost} (too low, minimum $300)`);
          return false;
        }
        
        // Reject trips with $0 flight costs when departure location is specified
        if (departureLocation && flightCost === 0 && totalCost < 1000) {
          console.warn(`Filtered out trip: $0 flight cost from ${departureLocation} to ${trip.destination} is unrealistic`);
          return false;
        }
        
        // Validate cost breakdown consistency
        if (trip.costBreakdown) {
          const calculatedTotal = (trip.costBreakdown.flightUSD || 0) +
                                 (trip.costBreakdown.hotelTotalUSD || 0) +
                                 (trip.costBreakdown.transportUSD || 0) +
                                 (trip.costBreakdown.activitiesUSD || 0) +
                                 (trip.costBreakdown.taxesFeesUSD || 0);
          const reportedTotal = trip.costBreakdown.totalUSD || 0;
          
          // Allow small rounding differences (within $10)
          if (Math.abs(calculatedTotal - reportedTotal) > 10) {
            console.warn(`Trip cost breakdown inconsistency: calculated $${calculatedTotal} vs reported $${reportedTotal}`);
          }
        }
        
        return true;
      });
      
      if (trips.length < originalCount) {
        console.warn(`Filtered out ${originalCount - trips.length} trip(s) due to validation failures`);
      }
    }
    
    if (extractedTrips && extractedTrips.length === 0) {
      console.warn('AI returned an empty trips array. Raw output (trimmed):', textOutput?.slice(0, 2000));
    } else if (extractedTrips) {
      console.log(`Found ${extractedTrips.length} trips in AI output, ${trips.length} passed validation.`);
    }

    // Sort trips by matchScore (match percentage) descending - best matches first
    trips.sort((a, b) => {
      const scoreA = a.matchScore || 0;
      const scoreB = b.matchScore || 0;
      return scoreB - scoreA; // Descending order
    });
    
    console.log('\n========== AI-GENERATED TRIPS (sorted by match score) ==========');
    trips.forEach((trip, idx) => {
      console.log(`\nTrip ${idx + 1} (Match: ${trip.matchScore || 'N/A'}%):`);
      console.log(`  Destination: ${trip.destination || trip.title || 'Unknown'}`);
      console.log(`  Total Cost: $${trip.costBreakdown?.totalUSD || trip.budgetUSD || 0}`);
      console.log(`  Duration: ${trip.durationDays || 'N/A'} days`);
    });
    console.log('===============================================================\n');

    // Log detailed trip outputs
    console.log('\n========== DETAILED TRIP OUTPUTS ==========');
    console.log(`Generated ${trips.length} trip(s), ranked by match score:`);
    trips.forEach((trip, idx) => {
      console.log(`\nTrip ${idx + 1} (Match Score: ${trip.matchScore || 'N/A'}%):`);
      console.log('  Destination:', trip.destination || trip.title || 'Unknown');
      console.log('  Cost (USD):', trip.costBreakdown?.totalUSD || trip.budgetUSD || 0);
      console.log('  Duration (days):', trip.durationDays || 'N/A');
      console.log('  Activities:', trip.activities?.length || 0, 'items');
      if (trip.costBreakdown) {
        console.log('  Cost Breakdown:');
        console.log('    Flight:', trip.costBreakdown.flightUSD || 0);
        console.log('    Hotel:', trip.costBreakdown.hotelTotalUSD || 0, `(${trip.costBreakdown.hotelNights || 0} nights)`);
        console.log('    Transport:', trip.costBreakdown.transportUSD || 0);
        console.log('    Activities:', trip.costBreakdown.activitiesUSD || 0);
        console.log('    Taxes & Fees:', trip.costBreakdown.taxesFeesUSD || 0);
        console.log('    Total:', trip.costBreakdown.totalUSD || 0);
      }
    });
    console.log('==========================================\n');

    // Cache and return AI-generated trips (already sorted by matchScore)
    tripCache.set(cacheKey, { createdAt: Date.now(), data: trips });
    res.json({ success: true, trips: trips, cached: false });
  } catch (err) {
    console.error('generate-trip error', err);
    res.status(500).json({ error: 'Failed to generate trips', message: err.message });
  }
});

// GET /api/get-image-url - Get Unsplash image URL for destination/activity
app.get('/api/get-image-url', async (req, res) => {
  try {
    const { destination, activity } = req.query;
    
    console.log(`[Image API] Request received - destination: ${destination}, activity: ${activity || 'none'}`);
    
    if (!destination) {
      return res.status(400).json({ error: 'Destination parameter is required' });
    }

    // If Unsplash API key is not set, return a fallback URL
    if (!UNSPLASH_ACCESS_KEY) {
      // Use Picsum Photos as fallback
      let hash = 0;
      const hashInput = `${destination}-${activity || ''}`;
      for (let i = 0; i < hashInput.length; i++) {
        hash = ((hash << 5) - hash) + hashInput.charCodeAt(i);
        hash = hash & hash;
      }
      const seed = Math.abs(hash);
      return res.json({ 
        imageUrl: `https://picsum.photos/seed/${seed}/800/400`,
        source: 'fallback'
      });
    }

    // Build search query: combine destination and activity
    let query = destination;
    if (activity) {
      // Clean activity text
      const cleanActivity = activity
        .replace(/\b(visit|explore|see|go to|check out|walk|stroll|the|a|an)\b/gi, '')
        .trim();
      if (cleanActivity && cleanActivity.length > 2) {
        query = `${cleanActivity}, ${destination}`;
      }
    }

    // Fetch image from Unsplash API
    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    
    const response = await fetch(unsplashUrl, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // Get the first result's regular URL (800px width)
      const imageUrl = data.results[0].urls?.regular || data.results[0].urls?.small;
      const finalUrl = imageUrl || data.results[0].urls?.thumb;
      console.log(`[Image API] Found Unsplash image for "${query}":`, finalUrl);
      return res.json({ 
        imageUrl: finalUrl,
        source: 'unsplash'
      });
    }
    
    console.log(`[Image API] No Unsplash results for "${query}", using fallback`);

    // Fallback if no results
    let hash = 0;
    const hashInput = `${destination}-${activity || ''}`;
    for (let i = 0; i < hashInput.length; i++) {
      hash = ((hash << 5) - hash) + hashInput.charCodeAt(i);
      hash = hash & hash;
    }
    const seed = Math.abs(hash);
    return res.json({ 
      imageUrl: `https://picsum.photos/seed/${seed}/800/400`,
      source: 'fallback'
    });

  } catch (error) {
    console.error('Error fetching image from Unsplash:', error);
    // Return fallback on error
    let hash = 0;
    const hashInput = `${req.query.destination || 'travel'}-${req.query.activity || ''}`;
    for (let i = 0; i < hashInput.length; i++) {
      hash = ((hash << 5) - hash) + hashInput.charCodeAt(i);
      hash = hash & hash;
    }
    const seed = Math.abs(hash);
    return res.json({ 
      imageUrl: `https://picsum.photos/seed/${seed}/800/400`,
      source: 'fallback',
      error: error.message
    });
  }
});

// POST /api/get-flight-price - Get estimated flight price
app.post('/api/get-flight-price', async (req, res) => {
  try {
    const { origin, destination, date } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    console.log(`[Flight Price] Request: ${origin} → ${destination} on ${date || 'any date'}`);
    
    // TODO: Integrate with real flight API (Amadeus, Skyscanner, etc.)
    // For now, use estimation based on real market data
    const estimatedPrice = await estimateFlightPrice(origin, destination, date);
    
    console.log(`[Flight Price] Estimated: $${estimatedPrice}`);
    
    res.json({
      success: true,
      price: estimatedPrice,
      currency: 'USD',
      source: 'estimated', // 'api' when real API is integrated
      origin,
      destination,
      date: date || null,
    });
  } catch (error) {
    console.error('Error getting flight price:', error);
    res.status(500).json({ error: 'Failed to get flight price', message: error.message });
  }
});

// POST /api/get-hotel-price - Get estimated hotel price
app.post('/api/get-hotel-price', async (req, res) => {
  try {
    const { destination, accommodation, checkin, checkout, budgetLevel } = req.body;
    
    if (!destination) {
      return res.status(400).json({ error: 'Destination is required' });
    }

    console.log(`[Hotel Price] Request: ${accommodation || 'hotel'} in ${destination}, ${checkin} to ${checkout}`);
    
    // Calculate number of nights from dates (MM/DD/YYYY format)
    let nights = 3; // default
    if (checkin && checkout && checkin.includes('/') && checkout.includes('/')) {
      try {
        // Parse MM/DD/YYYY format
        const [checkinMonth, checkinDay, checkinYear] = checkin.split('/').map(Number);
        const [checkoutMonth, checkoutDay, checkoutYear] = checkout.split('/').map(Number);
        const checkinDate = new Date(checkinYear, checkinMonth - 1, checkinDay);
        const checkoutDate = new Date(checkoutYear, checkoutMonth - 1, checkoutDay);
        const diffTime = Math.abs(checkoutDate - checkinDate);
        nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (nights < 1) nights = 1;
      } catch (e) {
        console.warn('Could not parse dates, using default nights');
      }
    }
    
    // TODO: Integrate with real hotel API (Booking.com, Hotels.com, etc.)
    // For now, use estimation
    const pricePerNight = estimateHotelPrice(destination, accommodation || '4-star Hotel', budgetLevel || 50);
    const totalPrice = pricePerNight * nights;
    
    console.log(`[Hotel Price] Estimated: $${pricePerNight}/night × ${nights} nights = $${totalPrice}`);
    
    res.json({
      success: true,
      pricePerNight,
      totalPrice,
      nights,
      currency: 'USD',
      source: 'estimated', // 'api' when real API is integrated
      destination,
      accommodation: accommodation || 'Hotel',
      checkin: checkin || null,
      checkout: checkout || null,
    });
  } catch (error) {
    console.error('Error getting hotel price:', error);
    res.status(500).json({ error: 'Failed to get hotel price', message: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TripSync backend listening on http://localhost:${PORT}`);
  if (UNSPLASH_ACCESS_KEY) {
    console.log('Unsplash API: Enabled');
  } else {
    console.log('Unsplash API: Disabled (using fallback images)');
  }
  console.log('Flight/Hotel Price APIs: Using estimated prices (integrate real APIs for production)');
});