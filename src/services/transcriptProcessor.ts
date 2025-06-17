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

export async function processCallTranscript(callId: string): Promise<void> {
  try {
    // Fetch the call record
    const result = await pool.query<CallRecord>(
      'SELECT id, transcript_url FROM emergency_calls WHERE id = $1',
      [callId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Call record not found with ID: ${callId}`);
    }

    const callRecord = result.rows[0];

    // Fetch the transcript content through our proxy
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const transcriptResponse = await fetch(`${baseUrl}/api/proxy/transcript?url=${encodeURIComponent(callRecord.transcript_url)}`);
    if (!transcriptResponse.ok) {
      throw new Error(`Failed to fetch transcript from URL: ${callRecord.transcript_url}`);
    }
    const transcript = await transcriptResponse.text();

    // Process with OpenAI
    const analysis = await analyzeTranscript(transcript);

    // Update the call record with the extracted information
    await pool.query(
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
  } catch (error) {
    console.error('Error in processCallTranscript:', error);
    throw error;
  }
}

async function analyzeTranscript(transcript: string): Promise<TranscriptAnalysis> {
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
  if (!response) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(response) as TranscriptAnalysis;
} 