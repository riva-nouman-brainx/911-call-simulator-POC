import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voiceId } = body;
    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text" }), { status: 400 });
    }

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const DEFAULT_VOICE_ID = "NHVXSL0y0YfmNcWiMbBM";
    const usedVoiceId = voiceId || DEFAULT_VOICE_ID;

    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing ElevenLabs API key" }), { status: 500 });
    }

    console.log(`[TTS] Proxying ElevenLabs TTS for text: ${text.slice(0, 40)}... voiceId: ${usedVoiceId}`);

    const elevenLabsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${usedVoiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.7,
          use_speaker_boost: true,
        },
      }),
    });

    if (!elevenLabsRes.ok) {
      const errorText = await elevenLabsRes.text();
      console.error(`[TTS] ElevenLabs error: ${errorText}`);
      return new Response(JSON.stringify({ error: errorText }), { status: elevenLabsRes.status });
    }

    // Stream the audio back to the client
    return new Response(elevenLabsRes.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[TTS] Server error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), { status: 500 });
  }
} 