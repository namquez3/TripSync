# Unsplash API Setup

To get location-specific images for trip recommendations, you need to set up an Unsplash API key.

## Steps to Get Unsplash API Key:

1. Go to https://unsplash.com/developers
2. Click "Register as a developer" or sign in
3. Create a new application
4. Copy your "Access Key" (also called Client ID)
5. Add it to your `backend/.env` file:

```
UNSPLASH_ACCESS_KEY=your_access_key_here
```

## Free Tier Limits:

- 50 requests per hour
- Perfect for development and small-scale use
- No credit card required

## Without API Key:

If you don't set the API key, the app will use fallback placeholder images (Picsum Photos). Images will still display, but they won't be location-specific.

## Testing:

After adding the API key, restart your backend server. You should see:
```
Unsplash API: Enabled
```

If the key is not set, you'll see:
```
Unsplash API: Disabled (using fallback images)
```

