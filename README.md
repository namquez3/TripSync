# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

### Frontend Setup

1. Install dependencies (in root directory)

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

### Backend Setup

1. Navigate to the server directory and install dependencies:

   ```bash
   cd server
   npm install
   ```

2. Create a `.env` file in the `server` directory:

   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

   Get your OpenAI API key from: https://platform.openai.com/api-keys

3. Start the backend server:

   ```bash
   npm start
   ```

   The server will run on `http://localhost:3000`

4. The app includes a Chat tab where you can interact with ChatGPT. Make sure the backend server is running before using it.

**Note for Physical Devices:**
- If testing on a physical device (not simulator/emulator), you'll need to update the API URL in `services/api.ts`
- Replace `localhost` with your computer's local IP address (e.g., `192.168.1.100:3000`)
- Find your IP: macOS/Linux: `ifconfig` or `ip addr`, Windows: `ipconfig`
- Make sure your device and computer are on the same WiFi network

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
