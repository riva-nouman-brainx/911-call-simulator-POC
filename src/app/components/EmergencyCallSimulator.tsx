"use client";

import React, { useState, useEffect } from 'react';
import App from '../App';
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";

const EmergencyCallSimulator: React.FC = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState('00:00');
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [shouldRefreshHistory, setShouldRefreshHistory] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  const fetchCallHistory = async (retryAttempt = 0) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/emergency-calls/all', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setCallHistory(data);
        setRetryCount(0); // Reset retry count on success
      } else {
        setCallHistory([]);
        throw new Error('Invalid data format');
      }
    } catch (err) {
      setCallHistory([]);
      console.log('Error fetching call history:', err);
      
      // Implement retry logic
      if (retryAttempt < MAX_RETRIES) {
        setTimeout(() => {
          fetchCallHistory(retryAttempt + 1);
        }, RETRY_DELAY * (retryAttempt + 1)); // Exponential backoff
      } else {
        setRetryCount(retryAttempt);
      }
    } finally {
      setIsLoading(false);
      setShouldRefreshHistory(false);
    }
  };

  // Initial fetch and refresh when shouldRefreshHistory changes
  useEffect(() => {
    fetchCallHistory();
  }, [shouldRefreshHistory]);

  const handleStartCall = async () => {
    if (isStartingCall) return; // Prevent multiple clicks
    
    try {
      setIsStartingCall(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      setMicStream(stream);
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", "emergencyCall");
      window.history.pushState({}, '', url.toString());
      setIsCallActive(true);
      const startTime = new Date();
      setCallStartTime(startTime);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setMicPermission('denied');
    } finally {
      setIsStartingCall(false);
    }
  };

  const handleEndCall = async () => {
    setIsCallActive(false);
    setCallStartTime(null);
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
    }
    
    try {
      // Add a longer delay to ensure the call is fully saved
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Fetch the most recent call
      const response = await fetch('/api/emergency-calls/all', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const calls = await response.json();
      
      if (calls && calls.length > 0) {
        const mostRecentCall = calls[0];
        console.log('Found most recent call:', mostRecentCall);
        
        // Verify the call has a transcript URL before processing
        if (!mostRecentCall.transcript_url) {
          console.log('Waiting for transcript URL to be available...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Fetch again to get updated call data
          const updatedResponse = await fetch('/api/emergency-calls/all', {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          const updatedCalls = await updatedResponse.json();
          if (updatedCalls && updatedCalls.length > 0) {
            const updatedCall = updatedCalls[0];
            if (updatedCall.transcript_url) {
              console.log('Processing transcript for call:', updatedCall.id);
              const processResponse = await fetch(`/api/emergency-calls/process-transcript/${updatedCall.id}`, {
                method: 'POST'
              });

              if (!processResponse.ok) {
                throw new Error('Failed to process transcript');
              }
            } else {
              console.log('Transcript URL still not available');
            }
          }
        } else {
          console.log('Processing transcript for call:', mostRecentCall.id);
          const processResponse = await fetch(`/api/emergency-calls/process-transcript/${mostRecentCall.id}`, {
            method: 'POST'
          });

          if (!processResponse.ok) {
            throw new Error('Failed to process transcript');
          }
        }

        // Refresh the call history after processing
        setShouldRefreshHistory(true);
      }
    } catch (error) {
      console.error('Error in call end processing:', error);
    }
  };

  // Add a manual refresh function
  const handleManualRefresh = () => {
    setShouldRefreshHistory(true);
  };

  const getCallDuration = () => {
    if (!callStartTime) return '00:00';
    const duration = new Date().getTime() - callStartTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCallActive && callStartTime) {
      timer = setInterval(() => {
        setCallDuration(getCallDuration());
      }, 1000);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isCallActive, callStartTime]);

  const openAudioModal = (url: string) => {
    setAudioUrl(url);
    setShowAudioModal(true);
  };

  const openTranscriptionModal = async (url: string) => {
    try {
      const res = await fetch(url);
      const text = await res.text();
      setTranscriptText(text);
      setShowTranscriptionModal(true);
    } catch (err) {
      console.log('Error loading transcript:', err);
      setTranscriptText('Failed to load transcript.');
      setShowTranscriptionModal(true);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#1A1A1A] text-[#ededed]">
      {/* Emergency Call Header */}
      <div className="bg-[#de6d1c] p-4 text-center">
        <h1 className="text-2xl font-bold text-[#23272f]">911 Non-Emergency Call Simulator</h1>
        {isCallActive && (
          <div className="mt-2">
            <span className="text-[#23272f] font-semibold">Call Duration: {callDuration}</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {!isCallActive ? (
          <div className="h-full flex flex-col">
            <div className="flex-1 p-6 overflow-hidden">
              <div className="max-w-4xl mx-auto h-full flex flex-col">
                <div className="history-container bg-[#23272f] rounded-lg p-6 flex flex-col h-full">
                  <div className="history-header flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-[#ededed]">Call History</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={handleManualRefresh}
                        className="refresh-button bg-[#23272f] hover:bg-[#de6d1c] hover:text-[#23272f] text-[#de6d1c] border border-[#de6d1c] px-3 py-1 rounded flex items-center gap-1 font-medium transition-colors"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#de6d1c]"></div>
                        ) : (
                          <span role="img" aria-label="refresh">🔄</span>
                        )}
                        Refresh
                      </button>
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#de6d1c]"></div>
                    </div>
                  ) : retryCount > 0 ? (
                    <div className="text-center py-12">
                      <p className="text-red-500 mb-4">Failed to load call history after {retryCount} attempts</p>
                      <button
                        onClick={() => {
                          setRetryCount(0);
                          setShouldRefreshHistory(true);
                        }}
                        className="bg-[#de6d1c] text-[#23272f] px-4 py-2 rounded hover:bg-[#c55c15] transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <div className={`history-list space-y-4 ${callHistory.length > 3 ? 'overflow-y-auto max-h-[calc(100vh-300px)]' : ''} pr-2`}>
                      {callHistory.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                          No call history available
                        </div>
                      ) : (
                        callHistory.map(call => (
                          <div key={call.id} className="history-item bg-[#171a20] p-4 rounded-lg">
                            <p className="font-medium mb-2 text-[#ededed]">
                              Call #{call.id} - {call.description || "Unknown Scenario"}
                            </p>
                            <div className="call-actions flex gap-2">
                              <button
                                className="audio-button bg-[#23272f] hover:bg-[#de6d1c] hover:text-[#23272f] text-[#de6d1c] border border-[#de6d1c] px-3 py-1 rounded flex items-center gap-1 font-medium transition-colors"
                                onClick={() => openAudioModal(call.recording_url)}
                              >
                                <span role="img" aria-label="audio">🔊</span> Audio
                              </button>
                              <button
                                className="transcription-button bg-[#23272f] hover:bg-[#de6d1c] hover:text-[#23272f] text-[#de6d1c] border border-[#de6d1c] px-3 py-1 rounded flex items-center gap-1 font-medium transition-colors"
                                onClick={() => openTranscriptionModal(call.transcript_url)}
                              >
                                <span role="img" aria-label="transcript">📝</span> Transcription
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 bg-[#1A1A1A] border-t border-[#333333]">
              <div className="max-w-4xl mx-auto">
                <button
                  className="start-button bg-[#de6d1c] hover:bg-[#c55c15] text-[#23272f] px-6 py-3 rounded-full text-lg font-bold w-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  onClick={handleStartCall}
                  disabled={micPermission === 'denied' || isStartingCall}
                >
                  {isStartingCall ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#23272f]"></div>
                      <span>Starting Call...</span>
                    </div>
                  ) : micPermission === 'denied' ? (
                    'Microphone Access Denied'
                  ) : (
                    'Start New Call'
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full">
            <TranscriptProvider>
              <EventProvider>
                <App 
                  isCallActive={isCallActive} 
                  onCallEnd={handleEndCall}
                  callStartTime={callStartTime}
                />
              </EventProvider>
            </TranscriptProvider>
          </div>
        )}
      </div>

      {/* Audio Modal */}
      {showAudioModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#23272f] rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[#ededed]">Call Audio</h3>
              <button
                onClick={() => setShowAudioModal(false)}
                className="text-[#de6d1c] hover:text-[#c55c15] text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            <audio controls src={audioUrl} className="w-full" />
          </div>
        </div>
      )}

      {/* Transcript Modal */}
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
              {transcriptText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyCallSimulator; 