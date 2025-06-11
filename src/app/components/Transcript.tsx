"use-client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { TranscriptItem } from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { DownloadIcon, ClipboardCopyIcon } from "@radix-ui/react-icons";
import { GuardrailChip } from "./GuardrailChip";
import jsPDF from 'jspdf';

export interface TranscriptProps {
  userText: string;
  setUserText: (val: string) => void;
  onSendMessage: () => void;
  canSend: boolean;
  downloadRecording: () => void;
}

function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  downloadRecording,
}: TranscriptProps) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]);
  const [justCopied, setJustCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function scrollToBottom() {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }

  useEffect(() => {
    const hasNewMessage = transcriptItems.length > prevLogs.length;
    const hasUpdatedMessage = transcriptItems.some((newItem, index) => {
      const oldItem = prevLogs[index];
      return (
        oldItem &&
        (newItem.title !== oldItem.title || newItem.data !== oldItem.data)
      );
    });

    if (hasNewMessage || hasUpdatedMessage) {
      scrollToBottom();
    }

    setPrevLogs(transcriptItems);
  }, [transcriptItems]);

  // Autofocus on text box input on load
  useEffect(() => {
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canSend]);

  const handleCopyTranscript = async () => {
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  const handleDownloadTranscript = () => {
    if (!transcriptRef.current) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;
    const lineHeight = 7;
    const maxWidth = pageWidth - (margin * 2);

    // Add title
    doc.setFontSize(16);
    doc.text("911 Call Transcript", pageWidth / 2, y, { align: "center" });
    y += lineHeight * 2;

    // Add timestamp
    doc.setFontSize(10);
    const now = new Date();
    doc.text(`Generated on: ${now.toLocaleString()}`, pageWidth / 2, y, { align: "center" });
    y += lineHeight * 2;

    // Helper function to add text with wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number) => {
      const splitText = doc.splitTextToSize(text, maxWidth);
      doc.text(splitText, x, y);
      return splitText.length * lineHeight;
    };

    // Process transcript items
    doc.setFontSize(12);
    [...transcriptItems]
      .sort((a, b) => a.createdAtMs - b.createdAtMs)
      .forEach((item) => {
        if (item.isHidden) return;

        // Check if we need a new page
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }

        if (item.type === "MESSAGE") {
          const isUser = item.role === "user";
          const message = `${item.timestamp} - ${isUser ? "Caller" : "Dispatcher"}: ${item.title}`;
          
          // Add message with different styling for user/dispatcher
          doc.setFont(isUser ? "helvetica" : "helvetica", "bold");
          doc.setTextColor(isUser ? "#FF6600" : "#000000");
          
          // Add wrapped text and update y position
          const textHeight = addWrappedText(message, margin, y, maxWidth);
          y += textHeight + lineHeight;
        } else if (item.type === "BREADCRUMB") {
          // Add breadcrumb with indentation
          doc.setFont("helvetica", "italic");
          doc.setTextColor("#666666");
          
          const breadcrumbText = `[${item.timestamp}] ${item.title}`;
          const textHeight = addWrappedText(breadcrumbText, margin, y, maxWidth);
          y += textHeight + lineHeight;

          if (item.expanded && item.data) {
            const dataText = JSON.stringify(item.data, null, 2);
            doc.setFont("helvetica", "normal");
            doc.setTextColor("#000000");
            
            // Split JSON data into lines and add each line
            const dataLines = dataText.split('\n');
            dataLines.forEach(line => {
              if (y > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                y = margin;
              }
              const lineHeight = addWrappedText(line, margin + 5, y, maxWidth - 5);
              y += lineHeight;
            });
            y += lineHeight;
          }
        }
      });

    // Save the PDF
    doc.save("911-call-transcript.pdf");
  };

  return (
    <div className="flex flex-col flex-1 bg-[#1A1A1A] min-h-0 rounded-xl">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-6 py-3 sticky top-0 z-10 text-[#E0E0E0] border-b border-[#808080] bg-[#1A1A1A] rounded-t-xl">
          <span className="font-semibold">Transcript</span>
          <div className="flex gap-x-2">
            <button
              onClick={handleDownloadTranscript}
              className="w-24 text-sm px-3 py-1 rounded-md bg-[#808080] hover:bg-[#FF6600] text-[#E0E0E0] flex items-center justify-center gap-x-1"
            >
              <DownloadIcon />
              Download PDF
            </button>
            <button
              onClick={downloadRecording}
              className="w-40 text-sm px-3 py-1 rounded-md bg-[#808080] hover:bg-[#FF6600] text-[#E0E0E0] flex items-center justify-center gap-x-1"
            >
              <DownloadIcon />
              <span>Download Audio</span>
            </button>
          </div>
        </div>

        {/* Transcript Content */}
        <div
          ref={transcriptRef}
          className="overflow-auto p-4 flex flex-col gap-y-4 h-full"
        >
          {[...transcriptItems]
            .sort((a, b) => a.createdAtMs - b.createdAtMs)
            .map((item) => {
            const {
              itemId,
              type,
              role,
              data,
              expanded,
              timestamp,
              title = "",
              isHidden,
              guardrailResult,
            } = item;

            if (isHidden) {
              return null;
            }

            if (type === "MESSAGE") {
              const isUser = role === "user";
              const containerClasses = `flex justify-end flex-col ${
                isUser ? "items-end" : "items-start"
              }`;
              const bubbleBase = `max-w-lg p-3 ${
                isUser ? "bg-[#FF6600] text-gray-100" : "bg-[#E0E0E0] text-[#1A1A1A]"
              }`;
              const isBracketedMessage =
                title.startsWith("[") && title.endsWith("]");
              const messageStyle = isBracketedMessage
                ? "italic text-[#808080]"
                : "";
              const displayTitle = isBracketedMessage
                ? title.slice(1, -1)
                : title;

              return (
                <div key={itemId} className={containerClasses}>
                  <div className="max-w-lg">
                    <div
                      className={`${bubbleBase} rounded-t-xl ${
                        guardrailResult ? "" : "rounded-b-xl"
                      }`}
                    >
                      <div
                        className={`text-xs ${
                          isUser ? "text-[#FFD1AF]" : "text-[#808080]"
                        } font-mono`}
                      >
                        {timestamp}
                      </div>
                      <div className={`whitespace-pre-wrap ${messageStyle}`}>
                        <ReactMarkdown>{displayTitle}</ReactMarkdown>
                      </div>
                    </div>
                    {guardrailResult && (
                      <div className="bg-[#808080] px-3 py-2 rounded-b-xl">
                        <GuardrailChip guardrailResult={guardrailResult} />
                      </div>
                    )}
                  </div>
                </div>
              );
            } else if (type === "BREADCRUMB") {
              return (
                <div
                  key={itemId}
                  className="flex flex-col justify-start items-start text-[#808080] text-sm"
                >
                  <span className="text-xs font-mono">{timestamp}</span>
                  <div
                    className={`whitespace-pre-wrap flex items-center font-mono text-sm text-[#E0E0E0] ${
                      data ? "cursor-pointer" : ""
                    }`}
                    onClick={() => data && toggleTranscriptItemExpand(itemId)}
                  >
                    {data && (
                      <span
                        className={`text-[#FF6600] mr-1 transform transition-transform duration-200 select-none font-mono ${
                          expanded ? "rotate-90" : "rotate-0"
                        }`}
                      >
                        ▶
                      </span>
                    )}
                    {title}
                  </div>
                  {expanded && data && (
                    <div className="text-[#E0E0E0] text-left">
                      <pre className="border-l-2 ml-1 border-[#808080] whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            } else {
              // Fallback if type is neither MESSAGE nor BREADCRUMB
              return (
                <div
                  key={itemId}
                  className="flex justify-center text-[#808080] text-sm italic font-mono"
                >
                  Unknown item type: {type}{" "}
                  <span className="ml-2 text-xs">{timestamp}</span>
                </div>
              );
            }
          })}
        </div>
      </div>

      <div className="p-4 flex items-center gap-x-2 flex-shrink-0 border-t border-[#808080]">
        <input
          ref={inputRef}
          type="text"
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSend) {
              onSendMessage();
            }
          }}
          className="flex-1 px-4 py-2 focus:outline-none bg-[#1A1A1A] text-[#E0E0E0] placeholder-[#808080]"
          placeholder="Type a message..."
        />
        <button
          onClick={onSendMessage}
          disabled={!canSend || !userText.trim()}
          className="bg-[#FF6600] text-[#1A1A1A] rounded-full px-2 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Transcript;
