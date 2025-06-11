"use client";

import React, { useState } from 'react';
import App from '../App';
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";

// Temporary mock data for UI development
const mockCallHistory = [
  {
    id: 1,
    scenario: "Abandoned Vehicle Report",
    audioUrl: "#",
    transcription: "Dispatcher: 911, what's your emergency?\nCaller: Hi, I'm calling about an abandoned vehicle..."
  },
  {
    id: 2,
    scenario: "Noise Complaint",
    audioUrl: "#",
    transcription: "Dispatcher: 911, what's your emergency?\nCaller: There's a loud party next door..."
  }
];

const EmergencyCallSimulator: React.FC = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [selectedTranscription, setSelectedTranscription] = useState("");
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  const handleStartCall = async () => {
    try {
      // Request microphone permission only when starting a call
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      setMicStream(stream); // Store the stream for later cleanup

      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", "emergencyCall");
      window.history.pushState({}, '', url.toString());
      
      setIsCallActive(true);
      setCallStartTime(new Date());
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setMicPermission('denied');
    }
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    setCallStartTime(null);
    // Stop and release the microphone stream
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
    }
  };

  const getCallDuration = () => {
    if (!callStartTime) return '00:00';
    const duration = new Date().getTime() - callStartTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const downloadCallRecords = () => {
    // To be implemented
    console.log("Downloading call records...");
  };

  const playAudio = (audioUrl: string) => {
    // To be implemented
    console.log("Playing audio from:", audioUrl);
  };

  const openTranscriptionModal = (transcription: string) => {
    setSelectedTranscription(transcription);
    setShowTranscriptionModal(true);
  };

  return (
    <div className="flex flex-col h-screen bg-[#1A1A1A] text-[#ededed]">
      {/* Emergency Call Header */}
      <div className="bg-[#de6d1c] p-4 text-center">
        <h1 className="text-2xl font-bold text-[#23272f]">911 Non-Emergency Call Simulator</h1>
        {isCallActive && (
          <div className="mt-2">
            <span className="text-[#23272f]">Call Duration: {getCallDuration()}</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {!isCallActive ? (
          <div className="h-full p-6">
            <div className="max-w-4xl mx-auto">
              <div className="history-container bg-[#23272f] rounded-lg p-6">
                <div className="history-header flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-[#ededed]">Call History</h2>
                  <button 
                    className="download-button bg-[#de6d1c] hover:bg-[#c55c15] text-[#23272f] px-4 py-2 rounded-lg flex items-center gap-2 font-semibold"
                    onClick={downloadCallRecords}
                  >
                    <span role="img" aria-label="download">📥</span> Download Records
                  </button>
                </div>
                <div className="history-list space-y-4">
                  {mockCallHistory.map(call => (
                    <div key={call.id} className="history-item bg-[#171a20] p-4 rounded-lg">
                      <p className="font-medium mb-2 text-[#ededed]">{call.scenario}</p>
                      <div className="call-actions flex gap-2">
                        <button 
                          className="audio-button bg-[#23272f] hover:bg-[#de6d1c] hover:text-[#23272f] text-[#de6d1c] border border-[#de6d1c] px-3 py-1 rounded flex items-center gap-1 font-medium transition-colors"
                          onClick={() => playAudio(call.audioUrl)}
                        >
                          <span role="img" aria-label="audio">🔊</span> Audio
                        </button>
                        <button 
                          className="transcription-button bg-[#23272f] hover:bg-[#de6d1c] hover:text-[#23272f] text-[#de6d1c] border border-[#de6d1c] px-3 py-1 rounded flex items-center gap-1 font-medium transition-colors"
                          onClick={() => openTranscriptionModal(call.transcription)}
                        >
                          <span role="img" aria-label="transcript">📝</span> Transcription
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <button 
                    className="start-button bg-[#de6d1c] hover:bg-[#c55c15] text-[#23272f] px-6 py-3 rounded-full text-lg font-bold w-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={handleStartCall}
                    disabled={micPermission === 'denied'}
                  >
                    {micPermission === 'denied' ? 'Microphone Access Denied' : 'Start New Call'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full">
            <TranscriptProvider>
              <EventProvider>
                <App isCallActive={isCallActive} onCallEnd={handleEndCall} />
              </EventProvider>
            </TranscriptProvider>
          </div>
        )}
      </div>

      {/* Transcription Modal */}
      {showTranscriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#23272f] rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[#ededed]">Call Transcription</h3>
              <button 
                onClick={() => setShowTranscriptionModal(false)}
                className="text-[#de6d1c] hover:text-[#c55c15] text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="whitespace-pre-wrap text-[#ededed]">
              {selectedTranscription}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyCallSimulator; 