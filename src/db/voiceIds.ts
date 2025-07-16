// Local database of ElevenLabs voice names and their IDs
// Add or update this list as needed

export interface VoiceEntry {
  name: string;
  id: string;
}

export const voiceDatabase: VoiceEntry[] = [
  { name: "Default", id: "EXAVITQu4vr4xnSDxMaL" },
  { name: "Arnold", id: "ErXwobaYiN019PkySvjV" },
  { name: "Josh", id: "TxGEqnHWrfWFTfGW9XjX" },
  { name: "Rachel", id: "21m00Tcm4TlvDq8ikWAM" },
  { name: "Elli", id: "MF3mGyEYCl7XYWbV9V6O" },
  { name: "Adam", id: "pNInz6obpgDQGcFmaJgB" },
  { name: "Domi", id: "AZnzlk1XvdvUeBnXmlld" },
  { name: "Antoni", id: "ErXwobaYiN019PkySvjV" }, 
];

// Helper to get voice ID by name
export function getVoiceIdByName(name: string): string | undefined {
  return voiceDatabase.find(v => v.name === name)?.id;
}

// Helper to get voice name by ID
export function getVoiceNameById(id: string): string | undefined {
  return voiceDatabase.find(v => v.id === id)?.name;
} 