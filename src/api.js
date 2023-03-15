import fetch from "node-fetch";
import express from "express";
const elevenLabsApiBaseUrl = import.meta.env.VITE_ELEVENLABS_API_BASE_URL;
const elevenLabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
const elevenLabsVoiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID;

async function textToSpeech(text) {
  const response = await fetch(`${elevenLabsApiBaseUrl}/v1/text-to-speech/${elevenLabsVoiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": elevenLabsApiKey,
    },
    body: JSON.stringify({
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Text-to-speech API call failed: ${response.statusText}`);
  }

  return await response.arrayBuffer();
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
  const agentResponse = await fetch(`${endpoint}/api/v1/agents/${agent_id}/run`, {
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

  const data = await agentResponse.json();

  try {
    const audioData = await textToSpeech(data.output);
    const audioDataB64 = Buffer.from(audioData).toString("base64");
    res.status(200).json({ text: data.output, audioData: audioDataB64 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


export const handler = app;
