import fetch from "node-fetch";
import express from "express";
// Removed
// const elevenLabsApiBaseUrl = import.meta.env.VITE_ELEVENLABS_API_BASE_URL;
// const elevenLabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
// const elevenLabsVoiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID;

// Added
const googleCloudApiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;


// Updated function to use Google Cloud Text-to-speech
async function textToSpeech(text) {
  const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleCloudApiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: {
        text: text,
      },
      voice: {
        languageCode: "en-US",
        name: "en-US-Wavenet-A",
      },
      audioConfig: {
        audioEncoding: "LINEAR16",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Text-to-speech API call failed: ${response.statusText}`);
  }

  const data = await response.json();
  const audioBuffer = Buffer.from(data.audioContent, "base64");
  return audioBuffer;
}



let endpoint = "https://app.agent-hq.io";
if (import.meta.env.VITE_AGHQ_ENDPOINT) {
  endpoint = import.meta.env.VITE_AGHQ_ENDPOINT;
}

const api_access_token = import.meta.env.VITE_AGHQ_API_ACCESS_TOKEN;

const agent_id = import.meta.env.VITE_AGHQ_AGENT_ID;

const app = express();
app.use(express.json());


app.post("/api", async (req, res) => {
  try {
    const response = await fetch(`${endpoint}/api/v1/agents/${agent_id}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_access_token}`,
      },
      body: JSON.stringify({
        input: req.body.input,
        history: req.body.history,
      }),
    });

    if (!response.ok) {
      console.error('Error with AGHQ request:', await response.text());
      return res.status(response.status).send('Error with AGHQ request');
    }

    const data = await response.json();
    const textResponse = data.result;

    const ttsResponse = await fetch(`${elevenLabsApiBaseUrl}/v1/text-to-speech/${elevenLabsVoiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": elevenLabsApiKey,
      },
      body: JSON.stringify({
        text: textResponse,
      }),
    });

    if (!ttsResponse.ok) {
      console.error('Error with ElevenLabs TTS request:', await ttsResponse.text());
      return res.status(ttsResponse.status).send('Error with ElevenLabs TTS request');
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioData = Buffer.from(audioBuffer).toString("base64");

    res.status(200).json({ text: textResponse, audioData });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send('Unexpected error');
  }
});







export const handler = app;
