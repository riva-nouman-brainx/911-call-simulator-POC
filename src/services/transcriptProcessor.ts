import OpenAI from 'openai';
import pool from '../db/config';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CallRecord {
  id: string;
  transcript_url: string;
  caller_name: string | null;
  caller_address: string | null;
  caller_phone: string | null;
  description: string | null;
}

interface TranscriptAnalysis {
  caller_name: string | null;
  caller_address: string | null;
  caller_phone: string | null;
  description: string | null;
}

function getBaseUrl() {
  console.log('[getBaseUrl] NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);
  console.log('[getBaseUrl] VERCEL_URL:', process.env.VERCEL_URL);
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function processCallTranscript(callId: string): Promise<void> {
  console.log('[processCallTranscript] Start', { callId });
  try {
    // Fetch the call record
    console.log('[processCallTranscript] Fetching call record from DB', { callId });
    const result = await pool.query<CallRecord>(
      'SELECT id, transcript_url FROM emergency_calls WHERE id = $1',
      [callId]
    );
    console.log('[processCallTranscript] DB query result:', result.rows);

    if (result.rows.length === 0) {
      console.error('[processCallTranscript] Call record not found', { callId });
      throw new Error(`Call record not found with ID: ${callId}`);
    }

    const callRecord = result.rows[0];
    console.log('[processCallTranscript] Call record:', callRecord);

    // Fetch the transcript content through our proxy
    const baseUrl = getBaseUrl();
    const proxyUrl = `${baseUrl}/api/proxy/transcript?url=${encodeURIComponent(callRecord.transcript_url)}`;
    console.log('[processCallTranscript] Fetching transcript from proxy', { proxyUrl });
    const transcriptResponse = await fetch(proxyUrl);
    console.log('[processCallTranscript] Transcript response status:', transcriptResponse.status);
    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error('[processCallTranscript] Failed to fetch transcript', { url: callRecord.transcript_url, status: transcriptResponse.status, errorText });
      throw new Error(`Failed to fetch transcript from URL: ${callRecord.transcript_url}`);
    }
    const transcript = await transcriptResponse.text();
    console.log('[processCallTranscript] Transcript fetched, length:', transcript.length);

    // Process with OpenAI
    let analysis;
    try {
      console.log('[processCallTranscript] Analyzing transcript with OpenAI');
      analysis = await analyzeTranscript(transcript);
      console.log('[processCallTranscript] OpenAI analysis result:', analysis);
    } catch (aiError) {
      console.error('[processCallTranscript] Error during OpenAI analysis:', aiError);
      throw aiError;
    }

    // Update the call record with the extracted information
    try {
      console.log('[processCallTranscript] Updating call record in DB', { callId, analysis });
      const updateResult = await pool.query(
        `UPDATE emergency_calls 
         SET caller_name = $1,
             caller_address = $2,
             caller_phone = $3,
             description = $4
         WHERE id = $5
         RETURNING *`,
        [
          analysis.caller_name,
          analysis.caller_address,
          analysis.caller_phone,
          analysis.description,
          callId
        ]
      );
      console.log('[processCallTranscript] Update result:', updateResult.rows);
    } catch (updateError) {
      console.error('[processCallTranscript] Error updating call record:', updateError);
      throw updateError;
    }
  } catch (error) {
    console.error('Error in processCallTranscript:', error);
    throw error;
  }
}

async function analyzeTranscript(transcript: string): Promise<TranscriptAnalysis> {
  console.log('[analyzeTranscript] Start', { transcriptLength: transcript.length });
  const prompt = `Analyze this call transcript and extract:
1. Full caller name (if provided) in "First Last" format
2. Complete address (if mentioned)
3. Phone number (convert to XXX-XXX-XXXX format if provided)
4. Brief description (4-5 words maximum)

Return ONLY a valid JSON object with NULL for missing fields. Example:
{
  "caller_name": null,
  "caller_address": "123 Main St",
  "caller_phone": "555-123-4567",
  "description": "Abandoned vehicle on street"
}

Transcript:
${transcript}`;
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that extracts structured information from call transcripts. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });
    const response = completion.choices[0].message.content;
    console.log('[analyzeTranscript] OpenAI response:', response);
    if (!response) {
      console.error('[analyzeTranscript] No response from OpenAI');
      throw new Error('No response from OpenAI');
    }
    const parsed = JSON.parse(response) as TranscriptAnalysis;
    console.log('[analyzeTranscript] Parsed analysis:', parsed);
    return parsed;
  } catch (error) {
    console.error('[analyzeTranscript] Error:', error);
    throw error;
  }
} 