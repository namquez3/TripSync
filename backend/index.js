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

// Helper function to estimate flight price based on route
// TODO: Integrate with real flight API (Amadeus, Skyscanner, etc.)
const estimateFlightPrice = (origin, destination, date) => {
  // Simple estimation based on distance and route type
  const domesticRoutes = ['US', 'United States'];
  const isDomestic = domesticRoutes.some(country => 
    (origin && origin.includes(country)) && (destination && destination.includes(country))
  );
  
  if (isDomestic) {
    return Math.floor(Math.random() * 400) + 300; // $300-700 for domestic
  }
  return Math.floor(Math.random() * 1400) + 600; // $600-2000 for international
};

// Helper function to estimate hotel price per night
// TODO: Integrate with real hotel API (Booking.com, Hotels.com, etc.)
const estimateHotelPrice = (destination, accommodation, budgetLevel) => {
  // Estimate based on accommodation type and budget preference
  const basePrices = {
    '3-star Hotel': { min: 60, max: 100 },
    '4-star Hotel': { min: 120, max: 200 },
    '5-star Hotel': { min: 250, max: 400 },
    '5-star Resort': { min: 300, max: 500 },
    'Luxury Resort': { min: 400, max: 600 },
  };
  
  const priceRange = basePrices[accommodation] || { min: 100, max: 200 };
  
  // Adjust based on budget preference (0-100 scale)
  const budgetMultiplier = (budgetLevel || 50) / 100; // 0 = budget, 1 = luxury
  const adjustedMin = priceRange.min * (0.7 + budgetMultiplier * 0.3);
  const adjustedMax = priceRange.max * (0.7 + budgetMultiplier * 0.3);
  
  return Math.floor(Math.random() * (adjustedMax - adjustedMin)) + adjustedMin;
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

    // System + user messages: provide explicit instructions to compute
    // realistic, auditable cost estimates and use dates when present.
    const messages = [
      {
        role: "system",
        content: `You are a travel data assistant. Produce concise, realistic trip recommendations for destinations worldwide (any country or region).
      CRITICAL: If a specific destination is provided, ALL trips MUST be in that exact destination. Do NOT suggest trips to other locations.
      For each trip:
      - Return an itemized cost breakdown (flight, hotel per night, hotel nights, transport, activities, taxes/fees).
      - Compute totalUSD and perPersonUSD and make sure they equal the sum of the components.
      - Provide a simple itinerary as a list of things to do (no day-by-day breakdown, no dates).
      - ALWAYS assume 1 traveler (single person trip). All costs should be calculated for one person only.
      - For international destinations, use appropriate local currency codes in the 'currency' field (e.g., EUR, GBP, JPY, CAD, AUD, etc.) but still provide costs in USD for consistency.
      - Consider international flight costs, visa requirements, and local pricing when calculating costs.
      Use plausible marketplace averages based on real-world travel data. The response MUST be a single JSON object that strictly matches the provided schema and must not include any extra text, commentary, or markdown.`
      },

      {
        role: "user",
        content: `You are creating ${maxResults} realistic trip recommendations. Return ONLY a JSON object with a "trips" array containing actual trip data. DO NOT return the schema definition.

User Preferences:
- Budget level (0-100, where 0=budget, 100=luxury): ${budget}
- Travel style (0-100, where 0=speed, 100=comfort): ${travelStyle}
- Planning flexibility (0-100, where 0=flexible, 100=certain): ${planning}
- Departure location: ${departureLocation || 'unspecified'}
- Destination: ${destination || 'anywhere in the world'}
- Start date: ${startDate || 'unspecified'}
- End date: ${endDate || 'unspecified'}

CRITICAL REQUIREMENTS:

1. DESTINATION: If destination is "${destination}", ALL trips must be in "${destination}". Do NOT suggest other cities.

2. FLIGHT COSTS (MANDATORY - NEVER $0):
${departureLocation ? `   - From ${departureLocation} to ${destination || 'destination'}: Calculate realistic round-trip airfare
   - Domestic US (e.g., Texas to New York): $300-700
   - Short domestic (under 500 miles): $200-500
   - Long domestic (2000+ miles): $400-800
   - International: $600-2000+ depending on distance
   - Example: Texas to New York = ~$400-600 round trip` : '   - Estimate based on route distance (see examples above)'}

3. HOTEL COSTS (per night):
   - Budget (0-30): $60-100/night
   - Mid-range (30-70): $120-200/night  
   - Luxury (70-100): $250-500+/night
   - Calculate hotelNights from dates: ${startDate && endDate ? `From ${startDate} to ${endDate}` : 'Use 3-5 nights if dates not provided'}

4. OTHER COSTS (per day):
   - Transport: $30-100/day (subway, taxis, car rental)
   - Activities: $50-200/day (tours, attractions, meals)
   - Taxes/Fees: $50-150 (airport fees, service charges)

5. TOTAL COST EXAMPLES:
   - 3-day domestic trip: $800-2000 minimum
   - 5-day domestic trip: $1200-3000 minimum
   - 3-day international: $1500-3500 minimum
   - NEVER create trips under $500 total

6. ITINERARY: Provide 5-8 specific activities/places to visit in the destination. Make them realistic and location-appropriate.

7. Return format: JSON object with "trips" array. Each trip must have: id, title, destination, startDate, endDate, durationDays, budgetUSD, currency, activities (array), latitude, longitude, accommodations, imageUrl (empty string), description, matchScore (0-100), itinerary (array of activity strings), costBreakdown (all fields with realistic numbers), assumptions (string), dataSources (array).

Return ONLY the JSON object, no schema, no explanations, no markdown.`
      }

    ];

    // The Responses API expects a single `input` prompt. We'll convert the
    // system/user messages into a single prompt and ask the model to return
    // ONLY a JSON object with actual trip data, NOT the schema.
    const schemaString = JSON.stringify(tripFunction, null, 2);
    const prompt = `System: ${messages[0].content}

User: ${messages[1].content}

CRITICAL: Return ONLY a JSON object with this exact structure (DO NOT return the schema definition, return actual trip data):

{
  "trips": [
    {
      "id": "trip-1",
      "title": "Example Trip Title",
      "destination": "${destination || 'Destination Name'}",
      "startDate": "${startDate || 'MM/DD/YYYY'}",
      "endDate": "${endDate || 'MM/DD/YYYY'}",
      "durationDays": 3,
      "budgetUSD": 1500,
      "currency": "USD",
      "activities": ["Activity 1", "Activity 2", "Activity 3"],
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accommodations": "Hotel description",
      "imageUrl": "",
      "description": "Brief trip description",
      "matchScore": 85,
      "itinerary": ["Activity 1", "Activity 2", "Activity 3"],
      "costBreakdown": {
        "flightUSD": 400,
        "hotelPerNightUSD": 120,
        "hotelNights": 3,
        "hotelTotalUSD": 360,
        "transportUSD": 150,
        "activitiesUSD": 200,
        "taxesFeesUSD": 90,
        "totalUSD": 1200,
        "perPersonUSD": 1200
      },
      "assumptions": "Assumptions text",
      "dataSources": ["Source 1", "Source 2"]
    }
  ]
}

IMPORTANT: 
- Return actual trip recommendations with realistic costs, NOT the schema definition
- Calculate flight costs: ${departureLocation ? `From ${departureLocation} to ${destination || 'destination'}, estimate realistic airfare (typically $300-800 for domestic US, $500-2000+ for international)` : 'Estimate realistic airfare based on route distance'}
- All costs must be realistic - a 3-day trip should cost $800-2000+ minimum
- Return ONLY the JSON object with trips array, no other text or schema`;

    const completion = await client.chat.completions.create({
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
    });

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

    // Enhance trips with real flight and hotel prices
    console.log('\n========== FETCHING REAL PRICES ==========');
    const enhancedTrips = trips.map((trip) => {
      try {
        // Get flight price using estimation function
        const flightPrice = estimateFlightPrice(
          departureLocation || 'New York',
          trip.destination || trip.title,
          startDate
        );
        
        // Calculate number of nights from dates (MM/DD/YYYY format)
        let nights = trip.durationDays || 3;
        if (startDate && endDate && startDate.includes('/') && endDate.includes('/')) {
          try {
            // Parse MM/DD/YYYY format
            const [startMonth, startDay, startYear] = startDate.split('/').map(Number);
            const [endMonth, endDay, endYear] = endDate.split('/').map(Number);
            const checkinDate = new Date(startYear, startMonth - 1, startDay);
            const checkoutDate = new Date(endYear, endMonth - 1, endDay);
            const diffTime = Math.abs(checkoutDate - checkinDate);
            nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (nights < 1) nights = 1;
          } catch (e) {
            // Use durationDays if date parsing fails
            console.warn('Could not parse dates, using durationDays');
          }
        }
        
        // Get hotel price using estimation function
        const hotelPricePerNight = estimateHotelPrice(
          trip.destination || trip.title,
          trip.accommodations || '4-star Hotel',
          budget
        );
        const hotelTotalPrice = hotelPricePerNight * nights;
        
        console.log(`  ${trip.destination || trip.title}:`);
        console.log(`    Flight: $${flightPrice} (estimated)`);
        console.log(`    Hotel: $${hotelPricePerNight}/night × ${nights} nights = $${hotelTotalPrice} (estimated)`);
        
        // Recalculate total with real prices
        const transportUSD = trip.costBreakdown?.transportUSD || nights * 50;
        const activitiesUSD = trip.costBreakdown?.activitiesUSD || nights * 100;
        const taxesFeesUSD = trip.costBreakdown?.taxesFeesUSD || 100;
        const newTotalUSD = flightPrice + hotelTotalPrice + transportUSD + activitiesUSD + taxesFeesUSD;
        
        // Update cost breakdown with real prices
        return {
          ...trip,
          budgetUSD: newTotalUSD,
          costBreakdown: {
            ...trip.costBreakdown,
            flightUSD: flightPrice,
            hotelPerNightUSD: hotelPricePerNight,
            hotelNights: nights,
            hotelTotalUSD: hotelTotalPrice,
            transportUSD: transportUSD,
            activitiesUSD: activitiesUSD,
            taxesFeesUSD: taxesFeesUSD,
            totalUSD: newTotalUSD,
            perPersonUSD: newTotalUSD, // Assuming 1 person for now
          },
        };
      } catch (error) {
        console.error(`Error enhancing trip ${trip.id}:`, error);
        return trip; // Return original trip if enhancement fails
      }
    });
    console.log('==========================================\n');

    // Log trip outputs
    console.log('\n========== TRIP OUTPUTS ==========');
    console.log(`Generated ${enhancedTrips.length} trip(s):`);
    enhancedTrips.forEach((trip, idx) => {
      console.log(`\nTrip ${idx + 1}:`);
      console.log('  Destination:', trip.destination || trip.title || 'Unknown');
      console.log('  Cost (USD):', trip.costBreakdown?.totalUSD || trip.budgetUSD || 0);
      console.log('  Duration (days):', trip.durationDays || 'N/A');
      console.log('  Match Score:', trip.matchScore || 'N/A');
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
    console.log('===================================\n');

    // Cache and return enhanced trips
    tripCache.set(cacheKey, { createdAt: Date.now(), data: enhancedTrips });
    res.json({ success: true, trips: enhancedTrips, cached: false });
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
    // For now, use estimation
    const estimatedPrice = estimateFlightPrice(origin, destination, date);
    
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