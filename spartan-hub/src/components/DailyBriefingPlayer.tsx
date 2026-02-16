/**
 * DailyBriefingPlayer Component
 * 
 * Displays personalized morning video briefings with playback controls
 * and interaction features.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react';
import './DailyBriefingPlayer.css';

interface BriefingData {
  id: string;
  userId: string;
  date: string;
  script: string;
  audioUrl: string;
  videoUrl: string;
  duration: number;
  watched: boolean;
}

interface DailyBriefingPlayerProps {
  userId: string;
  briefing?: BriefingData;
  onWatched?: (briefingId: string) => void;
  onRegenerate?: () => void;
}

export const DailyBriefingPlayer: React.FC<DailyBriefingPlayerProps> = ({
  userId,
  briefing,
  onWatched,
  onRegenerate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showScript, setShowScript] = useState(false);

  useEffect(() => {
    if (briefing && videoRef.current) {
      videoRef.current.load();
      setIsLoading(true);
    }
  }, [briefing]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);

      // Mark as watched at 90% completion
      if (currentProgress >= 90 && !briefing?.watched && onWatched) {
        onWatched(briefing!.id);
      }
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSkip = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.currentTime + 10,
        videoRef.current.duration
      );
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!briefing) {
    return (
      <div className="daily-briefing-player empty">
        <div className="briefing-empty-state">
          <div className="briefing-icon">🌅</div>
          <h3>No Briefing Available</h3>
          <p>Your morning briefing hasn't been generated yet.</p>
          {onRegenerate && (
            <button onClick={onRegenerate} className="btn btn-primary">
              Generate Briefing
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="daily-briefing-player">
      <div className="briefing-header">
        <h3>🌅 Morning Briefing</h3>
        <span className="briefing-date">
          {new Date(briefing.date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
          })}
        </span>
      </div>

      <div className="video-container">
        {isLoading && (
          <div className="video-loading">
            <div className="loading-spinner"></div>
            <p>Loading your personalized briefing...</p>
          </div>
        )}

        <video
          ref={videoRef}
          src={briefing.videoUrl}
          poster="/assets/briefing-poster.jpg"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onLoadedData={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
          muted={isMuted}
          className="briefing-video"
        />

        {/* Progress Bar */}
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="video-controls">
          <button
            onClick={handlePlayPause}
            className="control-btn play-btn"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button
            onClick={handleSkip}
            className="control-btn"
            aria-label="Skip forward 10 seconds"
          >
            <SkipForward size={20} />
          </button>

          <button
            onClick={handleMuteToggle}
            className="control-btn"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <span className="duration-display">
            {formatDuration(Math.floor(videoRef.current?.currentTime || 0))} /{' '}
            {formatDuration(briefing.duration)}
          </span>

          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="control-btn regenerate-btn"
              title="Regenerate briefing"
            >
              <RotateCcw size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Script Toggle */}
      <button
        onClick={() => setShowScript(!showScript)}
        className="script-toggle"
      >
        {showScript ? 'Hide Script' : 'Show Script'}
      </button>

      {showScript && (
        <div className="briefing-script">
          <p>{briefing.script}</p>
        </div>
      )}

      {/* Status */}
      {briefing.watched && (
        <div className="briefing-status watched">
          ✓ Watched
        </div>
      )}
    </div>
  );
};

export default DailyBriefingPlayer;
