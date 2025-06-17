import React from "react";
import { SessionStatus } from "@/app/types";

interface BottomToolbarProps {
  sessionStatus: SessionStatus;
  onToggleConnection: () => Promise<void>;
  isPTTActive: boolean;
  setIsPTTActive: (val: boolean) => void;
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (val: boolean) => void;
  codec: string;
  onCodecChange: (newCodec: string) => void;
  isDisconnecting?: boolean;
}

function BottomToolbar({
  sessionStatus,
  onToggleConnection,
  isPTTActive,
  setIsPTTActive,
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  codec,
  onCodecChange,
  isDisconnecting = false,
}: BottomToolbarProps) {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

  const handleCodecChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCodec = e.target.value;
    onCodecChange(newCodec);
  };

  function getConnectionButtonLabel() {
    if (isDisconnecting) return "Disconnecting...";
    if (isConnected) return "Disconnect";
    if (isConnecting) return "Connecting...";
    return "Connect";
  }

  function getConnectionButtonClasses() {
    const baseClasses = "text-white text-base p-2 w-36 rounded-md h-full";
    const cursorClass = (isConnecting || isDisconnecting) ? "cursor-not-allowed" : "cursor-pointer";

    if (isConnected && !isDisconnecting) {
      // Connected -> label "Disconnect" -> orange
      return `bg-[#de6d1c] hover:bg-[#c55c15] ${cursorClass} ${baseClasses}`;
    }
    // Disconnected, connecting, or disconnecting -> dark gray
    return `bg-[#333333] hover:bg-[#404040] ${cursorClass} ${baseClasses}`;
  }

  const handleDisconnect = async () => {
    try {
      await onToggleConnection();
    } catch (error) {
      console.error('Error during disconnection:', error);
    }
  };

  return (
    <div className="p-4 flex flex-row items-center justify-center gap-x-8 bg-[#1A1A1A] text-[#E0E0E0] border-t border-[#333333]">
      <button
        onClick={handleDisconnect}
        className={getConnectionButtonClasses()}
        disabled={isConnecting || isDisconnecting}
      >
        {isDisconnecting && (
          <span className="inline-block mr-2">
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
        )}
        {getConnectionButtonLabel()}
      </button>

      <div className="flex flex-row items-center gap-2">
        <input
          id="push-to-talk"
          type="checkbox"
          checked={isPTTActive}
          onChange={(e) => setIsPTTActive(e.target.checked)}
          disabled={!isConnected}
          className="w-4 h-4"
        />
        <label
          htmlFor="push-to-talk"
          className="flex items-center cursor-pointer"
        >
          Push to talk
        </label>
        <button
          onMouseDown={handleTalkButtonDown}
          onMouseUp={handleTalkButtonUp}
          onTouchStart={handleTalkButtonDown}
          onTouchEnd={handleTalkButtonUp}
          disabled={!isPTTActive}
          className={
            (isPTTUserSpeaking ? "bg-[#de6d1c] text-white" : "bg-[#333333] text-[#E0E0E0]") +
            " py-1 px-4 cursor-pointer rounded-md" +
            (!isPTTActive ? " bg-[#1A1A1A] text-[#666666]" : "")
          }
        >
          Talk
        </button>
      </div>

      <div className="flex flex-row items-center gap-1">
        <input
          id="audio-playback"
          type="checkbox"
          checked={isAudioPlaybackEnabled}
          onChange={(e) => setIsAudioPlaybackEnabled(e.target.checked)}
          disabled={!isConnected}
          className="w-4 h-4"
        />
        <label
          htmlFor="audio-playback"
          className="flex items-center cursor-pointer"
        >
          Audio playback
        </label>
      </div>

      <div className="flex flex-row items-center gap-2">
        <div>Codec:</div>
        <select
          id="codec-select"
          value={codec}
          onChange={handleCodecChange}
          className="border border-[#808080] rounded-md px-2 py-1 focus:outline-none cursor-pointer bg-[#1A1A1A] text-[#E0E0E0]"
        >
          <option value="opus">Opus (48 kHz)</option>
          <option value="pcmu">PCMU (8 kHz)</option>
          <option value="pcma">PCMA (8 kHz)</option>
        </select>
      </div>
    </div>
  );
}

export default BottomToolbar;
