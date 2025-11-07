import { Platform } from 'react-native';

// Development API URL configuration
// - iOS Simulator: use 'localhost' or '127.0.0.1'
// - Android Emulator: use '10.0.2.2' (special IP that maps to host machine's localhost)
// - Physical devices: use your computer's local IP address (e.g., '192.168.1.100')
//   Find your IP: macOS/Linux: `ifconfig` or `ip addr`, Windows: `ipconfig`
const getDevApiUrl = () => {
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    return 'http://10.0.2.2:3000';
  }
  // iOS simulator and web can use localhost
  return 'http://localhost:3000';
};

const API_BASE_URL = __DEV__
  ? getDevApiUrl()
  : 'https://your-production-api-url.com'; // Production - update with your deployed backend URL

export interface ChatResponse {
  success: boolean;
  response: string;
  error?: string;
}

export const chatAPI = {
  /**
   * Send a message to ChatGPT via the backend API
   * @param message - The user's message
   * @param model - Optional OpenAI model (default: 'gpt-3.5-turbo')
   * @returns Promise with the ChatGPT response
   */
  sendMessage: async (
    message: string,
    model: string = 'gpt-3.5-turbo'
  ): Promise<ChatResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          model,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        response: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },

  /**
   * Check if the backend server is running
   * @returns Promise with health status
   */
  healthCheck: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  },
};

