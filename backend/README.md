# TripSync Backend Server

This is the backend server for the TripSync Expo app, handling ChatGPT API integration.

## Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the `server` directory (or in the root directory):
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

   To get an OpenAI API key:
   - Go to https://platform.openai.com/api-keys
   - Sign up or log in
   - Create a new API key
   - Copy it to your `.env` file

3. **Run the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3000` by default.

## API Endpoints

### Health Check
- **GET** `/health`
- Returns server status

### Chat
- **POST** `/api/chat`
- Body: `{ "message": "your message", "model": "gpt-3.5-turbo" }`
- Returns: `{ "success": true, "response": "AI response" }`

## Notes

- Make sure the server is running before using the chat feature in the app
- For production, update the `API_BASE_URL` in `services/api.ts` with your deployed backend URL
- Never commit your `.env` file with your API key

