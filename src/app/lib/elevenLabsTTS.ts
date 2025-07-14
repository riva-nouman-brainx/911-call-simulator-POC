// Utility for ElevenLabs Text-to-Speech integration
// See: https://docs.elevenlabs.io/api-reference/text-to-speech

// Place your ElevenLabs API key in an environment variable, e.g., process.env.ELEVENLABS_API_KEY
// Place your desired voice ID (elderly female) below or pass as a parameter

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "YOUR_ELEVENLABS_API_KEY_HERE"; // <-- Replace or set in .env.local
const DEFAULT_VOICE_ID = "y1adqrqs4jNaANXsIZnD"; // Test voice ID for differentiation

/**
 * Fetches TTS audio from the local API route for ElevenLabs for the given text.
 * @param {string} text - The text to synthesize.
 * @param {string} [voiceId] - Optional: Override the default voice ID.
 * @returns {Promise<Blob>} - The audio as a Blob (MPEG audio).
 */
export async function fetchElevenLabsTTS(text: string, voiceId?: string): Promise<Blob> {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, voiceId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS API failed: ${response.status} ${errorText}`);
  }

  return await response.blob();
}