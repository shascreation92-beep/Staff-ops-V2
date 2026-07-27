"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2, Send } from "lucide-react";

interface VoiceRecorderProps {
  onSendVoiceNote: (audioUrl: string, durationSeconds: number) => void;
  onCancel?: () => void;
}

export function VoiceRecorder({ onSendVoiceNote, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone permission denied or unavailable", err);
      alert("Microphone permission is required to record voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlayPlayback = () => {
    if (!audioRef.current && audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const discardRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsRecording(false);
    if (onCancel) onCancel();
  };

  const handleSend = () => {
    if (!audioUrl) return;
    onSendVoiceNote(audioUrl, recordingTime);
    discardRecording();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex items-center gap-3 bg-slate-900/90 text-white px-4 py-2 rounded-2xl border border-cyan-500/30 shadow-lg animate-in fade-in duration-200">
      {!audioUrl ? (
        <>
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="w-9 h-9 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center transition-all animate-pulse shadow-md"
              title="Stop Recording"
            >
              <Square className="w-4 h-4 text-white fill-white" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-600 flex items-center justify-center transition-all shadow-md"
              title="Start Recording Voice Note"
            >
              <Mic className="w-4 h-4 text-white" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="font-mono text-sm text-cyan-300">
              {isRecording ? formatTime(recordingTime) : "Tap Mic to record"}
            </span>
          </div>

          <button
            onClick={discardRecording}
            className="ml-auto text-slate-400 hover:text-rose-400 text-xs px-2 py-1 transition-colors"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            onClick={togglePlayPlayback}
            className="w-8 h-8 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 flex items-center justify-center transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <span className="font-mono text-xs text-cyan-200">
            Voice Note ({formatTime(recordingTime)})
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={discardRecording}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
              title="Delete recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium text-xs rounded-xl shadow-md transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}
