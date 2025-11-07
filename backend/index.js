const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// ChatGPT API endpoint (this is just a test for now)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, model = 'gpt-3.5-turbo' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('TODO! We can use this route to call the OpenAI API and get a response');

    // if (!process.env.OPENAI_API_KEY) {
    //   return res.status(500).json({ error: 'OpenAI API key is not configured' });
    // }

    // const completion = await openai.chat.completions.create({
    //   model: model,
    //   messages: [
    //     {
    //       role: 'user',
    //       content: message,
    //     },
    //   ],
    //   max_tokens: 500,
    // });

    // const response = completion.choices[0]?.message?.content || 'No response';

    // res.json({
    //   success: true,
    //   response: response,
    // });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({
      error: 'Failed to get response from ChatGPT',
      message: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

