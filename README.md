# TripSync

## Quick Start

```bash
# Clone the repo
git clone https://github.com/<your-username>/TripSync.git
cd TripSync

# Frontend: install deps and start Expo
cd frontend
npm install
npm start

# In another terminal: start the backend
cd backend
npm install
echo "OPENAI_API_KEY=your_key_here\nPORT=3000" > .env # worry about this when we implement the backend
npm start
```

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
