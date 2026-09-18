import React, { 
  useState, 
  useEffect, 
  useRef, 
  useCallback 
} from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  Volume1, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  Loader2,
  Sparkles
} from 'lucide-react';

export interface VideoShowcaseProps {
  src?: string;
  poster?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  autoPlayOnScroll?: boolean;
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const VideoShowcase: React.FC<VideoShowcaseProps> = ({
  src = '/Cortex.mp4',
  poster = '/cortex-video-poster.jpg',
  title = 'Cortex Neural Engine in Action',
  subtitle = 'Watch deterministic graph-routing solve complex enterprise codebase queries',
  className = '',
  autoPlayOnScroll = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.85);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);
  const [isEnded, setIsEnded] = useState<boolean>(false);

  // UX & Interactive state
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [showCenterPlay, setShowCenterPlay] = useState<boolean>(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverRatio, setHoverRatio] = useState<number>(0);
  const [isHoveringProgress, setIsHoveringProgress] = useState<boolean>(false);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [hasInteractedWithSound, setHasInteractedWithSound] = useState<boolean>(false);
  const [isInViewport, setIsInViewport] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // IntersectionObserver for lazy load & autoplay muted on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const visible = entry.isIntersecting;
          setIsInViewport(visible);

          if (autoPlayOnScroll && !prefersReducedMotion && videoRef.current) {
            if (visible && !hasInteractedWithSound && videoRef.current.paused) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current
                .play()
                .then(() => {
                  setIsPlaying(true);
                })
                .catch((err) => {
                  console.warn('[VideoShowcase] Autoplay prevented:', err);
                });
            } else if (!visible && !videoRef.current.paused) {
              // Pause when scrolled out of view to save battery and GPU
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [autoPlayOnScroll, prefersReducedMotion, hasInteractedWithSound]);

  // Handle Fullscreen change sync
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Reset controls timer
  const triggerActivity = useCallback(() => {
    setControlsVisible(true);
    setShowCenterPlay(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!isScrubbing && !isHoveringProgress) {
          setControlsVisible(false);
          setShowCenterPlay(false);
        }
      }, 2400);
    }
  }, [isPlaying, isScrubbing, isHoveringProgress]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      setDuration(video.duration);
      setIsVideoLoaded(true);
    };

    const onTimeUpdate = () => {
      if (!isScrubbing) {
        setCurrentTime(video.currentTime);
      }
    };

    const onProgress = () => {
      if (video.buffered.length > 0 && video.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBufferedPercent((bufferedEnd / video.duration) * 100);
      }
    };

    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setIsEnded(false);
      setIsPlaying(true);
    };
    const onPause = () => {
      setIsPlaying(false);
      setControlsVisible(true);
      setShowCenterPlay(true);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setIsEnded(true);
      setControlsVisible(true);
      setShowCenterPlay(true);
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('progress', onProgress);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [isScrubbing]);

  // Imperative video control actions
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isEnded) {
      video.currentTime = 0;
      video.play().catch(console.error);
      setIsEnded(false);
      setIsPlaying(true);
      return;
    }

    if (video.paused) {
      video.play().catch(console.error);
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    triggerActivity();
  }, [isEnded, triggerActivity]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    setHasInteractedWithSound(true);

    if (!nextMuted && video.volume === 0) {
      video.volume = 0.8;
      setVolume(0.8);
    }
    triggerActivity();
  }, [triggerActivity]);

  const handleUnmuteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    setIsMuted(false);
    if (video.volume === 0) {
      video.volume = 0.85;
      setVolume(0.85);
    }
    setHasInteractedWithSound(true);

    if (video.paused) {
      video.play().catch(console.error);
      setIsPlaying(true);
    }
    triggerActivity();
  }, [triggerActivity]);

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;

    const clamped = Math.max(0, Math.min(1, newVolume));
    video.volume = clamped;
    setVolume(clamped);
    if (clamped === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
    setHasInteractedWithSound(true);
    triggerActivity();
  };

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(console.error);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(console.error);
      }
    }
    triggerActivity();
  }, [triggerActivity]);

  // Progress scrubbing calculation
  const calculateProgressFromEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent | TouchEvent) => {
    if (!progressBarRef.current || duration === 0) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio;
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsScrubbing(true);
    const ratio = calculateProgressFromEvent(e);
    const targetTime = ratio * duration;
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      const moveRatio = calculateProgressFromEvent(moveEvent);
      const moveTime = moveRatio * duration;
      setCurrentTime(moveTime);
      if (videoRef.current) {
        videoRef.current.currentTime = moveTime;
      }
    };

    const onMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      triggerActivity();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverRatio(ratio);
    setHoverTime(ratio * duration);
    setIsHoveringProgress(true);
  };

  const handleProgressMouseLeave = () => {
    setIsHoveringProgress(false);
    setHoverTime(null);
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    triggerActivity();
    const video = videoRef.current;
    if (!video) return;

    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
        setCurrentTime(video.currentTime);
        break;
      case 'ArrowRight':
        e.preventDefault();
        video.currentTime = Math.min(duration, video.currentTime + 5);
        setCurrentTime(video.currentTime);
        break;
      case 'ArrowUp':
        e.preventDefault();
        handleVolumeChange(volume + 0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        handleVolumeChange(volume - 0.1);
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
      default:
        break;
    }
  };

  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`w-full max-w-5xl mx-auto my-8 select-none ${className}`}>
      {/* Outer Glow Container with Apple / Linear Hardware Mockup Frame */}
      <div
        ref={containerRef}
        tabIndex={0}
        role="region"
        aria-label="Cortex Product Video Player"
        onKeyDown={handleKeyDown}
        onMouseMove={triggerActivity}
        onTouchStart={triggerActivity}
        onMouseLeave={() => {
          if (isPlaying && !isScrubbing) {
            setControlsVisible(false);
            setShowCenterPlay(false);
          }
        }}
        className={`group relative w-full aspect-video rounded-2xl overflow-hidden bg-[#06080e] border border-slate-800/80 shadow-[0_0_50px_-12px_rgba(99,102,241,0.25)] focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus:outline-none transition-all duration-300 ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none max-w-none border-none' : ''
        }`}
      >
        {/* Ambient Back Glow */}
        <div 
          className="absolute -inset-1 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/10 rounded-2xl blur-xl opacity-60 pointer-events-none group-hover:opacity-100 transition-opacity duration-500 -z-10" 
        />

        {/* Top Window Bezel Bar (Apple / Linear Showcase Style) */}
        {!isFullscreen && (
          <div className="absolute top-0 left-0 right-0 h-10 px-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent z-20 pointer-events-none">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400/40" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-400/40" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40" />
              <span className="ml-3 text-xs font-mono text-slate-400 tracking-wider">
                {title}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-mono text-indigo-300">
                <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                <span>Architecture Walkthrough</span>
              </span>
            </div>
          </div>
        )}

        {/* Video Element */}
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          playsInline
          muted={isMuted}
          preload={isInViewport ? 'auto' : 'metadata'}
          controls={false}
          onClick={togglePlay}
          className={`w-full h-full object-cover cursor-pointer transition-opacity duration-700 ${
            isVideoLoaded ? 'opacity-100' : 'opacity-90'
          }`}
        />

        {/* Click to Unmute Pill Badge */}
        {isMuted && isPlaying && !hasInteractedWithSound && (
          <button
            type="button"
            onClick={handleUnmuteClick}
            aria-label="Click to Unmute Audio"
            className="absolute top-14 right-4 z-30 inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-indigo-500/50 hover:border-indigo-400 text-white text-xs font-mono shadow-xl shadow-indigo-950/40 backdrop-blur-md transition-all duration-300 cursor-pointer animate-pulse hover:animate-none hover:scale-105 active:scale-95"
          >
            <VolumeX className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold tracking-wide">Sound Off • Click to Unmute</span>
          </button>
        )}

        {/* Buffering Loading Spinner Overlay */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs z-20 pointer-events-none">
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <span className="text-xs font-mono text-slate-300 tracking-wider">Streaming Video...</span>
            </div>
          </div>
        )}

        {/* Big Center Play / Pause Button Overlay */}
        <div 
          className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300 ${
            (showCenterPlay || !isPlaying) ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            aria-label={isPlaying ? 'Pause Video' : 'Play Video'}
            className="pointer-events-auto p-5 sm:p-6 rounded-full bg-slate-950/70 hover:bg-indigo-600/80 border border-white/20 hover:border-indigo-400/60 text-white backdrop-blur-md shadow-2xl shadow-indigo-950/60 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer group/center"
          >
            {isEnded ? (
              <RotateCcw className="w-8 h-8 sm:w-10 sm:h-10 text-slate-100 group-hover/center:text-white" />
            ) : isPlaying ? (
              <Pause className="w-8 h-8 sm:w-10 sm:h-10 text-slate-100 group-hover/center:text-white fill-current" />
            ) : (
              <Play className="w-8 h-8 sm:w-10 sm:h-10 text-slate-100 group-hover/center:text-white fill-current translate-x-0.5" />
            )}
          </button>
        </div>

        {/* Bottom Custom Controls Bar */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-30 transition-all duration-300 ${
            controlsVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          {/* Progress Bar Container with Hover Scrub Preview */}
          <div
            ref={progressBarRef}
            onMouseDown={handleProgressMouseDown}
            onMouseMove={handleProgressMouseMove}
            onMouseLeave={handleProgressMouseLeave}
            className="relative w-full h-5 flex items-center cursor-pointer group/progress mb-3"
          >
            {/* Timestamp Tooltip on Hover */}
            {isHoveringProgress && hoverTime !== null && (
              <div
                style={{ left: `${hoverRatio * 100}%` }}
                className="absolute -top-8 -translate-x-1/2 px-2 py-1 rounded bg-slate-900/90 border border-slate-700 text-[11px] font-mono text-white shadow-md pointer-events-none transition-transform"
              >
                {formatTime(hoverTime)}
              </div>
            )}

            {/* Background Track */}
            <div className="w-full h-1 group-hover/progress:h-2 bg-white/15 rounded-full overflow-hidden transition-all duration-200 relative">
              {/* Buffer Bar */}
              <div
                style={{ width: `${bufferedPercent}%` }}
                className="absolute top-0 bottom-0 left-0 bg-white/25 rounded-full transition-all duration-300"
              />
              {/* Played Bar */}
              <div
                style={{ width: `${currentPercent}%` }}
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 rounded-full"
              />
            </div>

            {/* Scrubber Playhead Thumb */}
            <div
              style={{ left: `${currentPercent}%` }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_10px_rgba(99,102,241,0.9)] opacity-0 group-hover/progress:opacity-100 scale-75 group-hover/progress:scale-100 transition-all duration-150 pointer-events-none"
            />
          </div>

          {/* Controls Footer Row */}
          <div className="flex items-center justify-between text-slate-300">
            {/* Left Controls: Play/Pause, Replay, Time Display */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="p-2 sm:p-2.5 rounded-lg hover:bg-white/10 text-slate-200 hover:text-white transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {isEnded ? (
                  <RotateCcw className="w-5 h-5" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
              </button>

              {/* Time readout */}
              <div className="text-xs font-mono text-slate-300 tracking-wider">
                <span className="text-white font-semibold">{formatTime(currentTime)}</span>
                <span className="text-slate-500 mx-1">/</span>
                <span className="text-slate-400">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Volume Slider, Fullscreen */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Volume Button & Hover Slider */}
              <div className="flex items-center group/vol">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-red-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>

                {/* Smooth Slider (Expands on hover) */}
                <div className="w-0 group-hover/vol:w-20 transition-all duration-300 overflow-hidden flex items-center px-0 group-hover/vol:px-1">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    aria-label="Volume Slider"
                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subtitle / Caption Footer */}
      {subtitle && (
        <p className="mt-3 text-center text-xs font-mono text-slate-400 tracking-wide">
          {subtitle}
        </p>
      )}
    </div>
  );
};
