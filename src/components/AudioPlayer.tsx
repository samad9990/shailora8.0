import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, ChevronUp, Check, Music } from "lucide-react";

interface SoundTrack {
  id: string;
  name: string;
  url: string;
  active: boolean;
}

interface PlatformMedia {
  type: "spotify" | "youtube" | "soundcloud" | "direct" | "procedural";
  embedUrl?: string;
}

function parseAudioUrl(url: string): PlatformMedia {
  if (!url || url === "procedural") {
    return { type: "procedural" };
  }

  const cleanUrl = url.trim();

  // Spotify
  if (cleanUrl.includes("spotify.com")) {
    let embedUrl = cleanUrl;
    if (!cleanUrl.includes("/embed/")) {
      embedUrl = cleanUrl
        .replace("open.spotify.com/", "open.spotify.com/embed/")
        .split("?")[0];
    }
    return { type: "spotify", embedUrl };
  }

  // YouTube
  if (cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be")) {
    let videoId = "";
    if (cleanUrl.includes("youtu.be/")) {
      videoId = cleanUrl.split("youtu.be/")[1]?.split("?")[0]?.split("&")[0];
    } else if (cleanUrl.includes("v=")) {
      videoId = cleanUrl.split("v=")[1]?.split("&")[0]?.split("?")[0];
    } else if (cleanUrl.includes("youtube.com/embed/")) {
      videoId = cleanUrl.split("youtube.com/embed/")[1]?.split("?")[0]?.split("&")[0];
    }
    const embedUrl = videoId 
      ? `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1` 
      : cleanUrl;
    return { type: "youtube", embedUrl };
  }

  // SoundCloud
  if (cleanUrl.includes("soundcloud.com")) {
    const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(cleanUrl)}&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false&color=%231c1917`;
    return { type: "soundcloud", embedUrl };
  }

  return { type: "direct" };
}

export default function AudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [activeSound, setActiveSound] = useState<SoundTrack | null>(null);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [allSounds, setAllSounds] = useState<SoundTrack[]>([]);

  const loadAllSounds = async () => {
    try {
      const response = await fetch("/api/sounds");
      if (response.ok) {
        const sounds: SoundTrack[] = await response.json();
        setAllSounds(sounds);
      }
    } catch (err) {
      console.error("Failed to load sounds", err);
    }
  };

  const handleSelectSound = async (sound: SoundTrack) => {
    try {
      const response = await fetch(`/api/sounds/${sound.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      if (response.ok) {
        setActiveSound(sound);
        if (!isPlaying) {
          setIsPlaying(true);
        }
        setShowSongPicker(false);
        window.dispatchEvent(new Event("shailora-sound-changed"));
      }
    } catch (err) {
      console.error("Failed to set sound", err);
    }
  };
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const windGainRef = useRef<GainNode | null>(null);
  const padGainRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<any[]>([]);

  // HTML Audio reference for external stream/mp3 links
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch active sound
  const fetchActiveSound = async () => {
    try {
      const response = await fetch("/api/sounds");
      if (response.ok) {
        const sounds: SoundTrack[] = await response.json();
        const active = sounds.find((s) => s.active) || sounds[0];
        if (active) {
          setActiveSound(active);
        }
      }
    } catch (err) {
      console.error("Failed to fetch soundtracks", err);
    }
  };

  useEffect(() => {
    fetchActiveSound();

    // Listen to changes in soundtracks
    const handleSoundChanged = () => {
      fetchActiveSound();
    };

    window.addEventListener("shailora-sound-changed", handleSoundChanged);
    return () => {
      window.removeEventListener("shailora-sound-changed", handleSoundChanged);
    };
  }, []);

  // Sync sound playback when active track changes
  useEffect(() => {
    if (!isPlaying) return;

    // If active sound changed, we must stop what was playing and start the new one
    stopAllPlayback();
    startActivePlayback();
  }, [activeSound?.id]);

  useEffect(() => {
    // Scroll event listener to modulate wind intensity
    const handleScroll = () => {
      if (!isPlaying || !windGainRef.current || !audioCtxRef.current) return;
      
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight || 1000;
      const scrollRatio = Math.min(scrollY / maxScroll, 1);
      
      // Wind swells between 0.03 and 0.1 based on scrolling
      const targetVolume = 0.03 + (scrollRatio * 0.07);
      
      windGainRef.current.gain.setTargetAtTime(
        targetVolume,
        audioCtxRef.current.currentTime,
        0.5
      );
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isPlaying]);

  const initProceduralAudio = () => {
    if (audioCtxRef.current) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0, ctx.currentTime);
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    // Wind generation
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(450, ctx.currentTime);
    filter.Q.setValueAtTime(2.0, ctx.currentTime);

    const filterLfo = ctx.createOscillator();
    filterLfo.type = "sine";
    filterLfo.frequency.setValueAtTime(0.08, ctx.currentTime);
    
    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.setValueAtTime(180, ctx.currentTime);

    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(filter.frequency);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.04, ctx.currentTime);
    windGainRef.current = windGain;

    whiteNoise.connect(filter);
    filter.connect(windGain);
    windGain.connect(masterGain);

    whiteNoise.start(0);
    filterLfo.start(0);
    nodesRef.current.push(whiteNoise, filterLfo);

    // Concrete Pad Drone
    const frequencies = [49.00, 73.42, 98.00, 123.47];
    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0.015, ctx.currentTime);
    padGainRef.current = padGain;
    padGain.connect(masterGain);

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const oscLfo = ctx.createOscillator();
      oscLfo.type = "sine";
      oscLfo.frequency.setValueAtTime(0.03 + (idx * 0.01), ctx.currentTime);

      const oscLfoGain = ctx.createGain();
      oscLfoGain.gain.setValueAtTime(0.005, ctx.currentTime);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.01, ctx.currentTime);

      oscLfo.connect(oscLfoGain);
      oscLfoGain.connect(oscGain.gain);
      
      osc.connect(oscGain);
      oscGain.connect(padGain);

      osc.start(0);
      oscLfo.start(0);
      nodesRef.current.push(osc, oscLfo);
    });

    masterGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 3.0);
  };

  const stopAllPlayback = () => {
    // Stop procedural synth
    if (masterGainRef.current && audioCtxRef.current) {
      try {
        masterGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
      } catch (e) {}
      try {
        audioCtxRef.current.suspend();
      } catch (e) {}
    }

    // Stop HTML Audio link
    if (htmlAudioRef.current) {
      htmlAudioRef.current.pause();
      htmlAudioRef.current.currentTime = 0;
    }
  };

  const startActivePlayback = () => {
    if (!activeSound) return;

    const parsed = parseAudioUrl(activeSound.url);

    if (parsed.type === "procedural") {
      // Procedural Synth
      if (!audioCtxRef.current) {
        initProceduralAudio();
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.resume().then(() => {
          if (masterGainRef.current) {
            masterGainRef.current.gain.setTargetAtTime(1.0, audioCtxRef.current!.currentTime, 0.5);
          }
        });
      }
    } else if (parsed.type === "direct") {
      // Standard audio file link
      if (!htmlAudioRef.current) {
        htmlAudioRef.current = new Audio(activeSound.url);
        htmlAudioRef.current.loop = true;
      } else if (htmlAudioRef.current.src !== activeSound.url) {
        htmlAudioRef.current.src = activeSound.url;
      }
      
      htmlAudioRef.current.volume = 0.5;
      htmlAudioRef.current.play().catch((err) => {
        console.error("Failed to play custom soundtrack link", err);
      });
    } else {
      // Embed player is rendered reactively in the JSX when isPlaying is true.
      // No extra Web Audio or HTML Audio processing needed here.
    }
  };

  const handleToggleSound = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }

    if (isPlaying) {
      // Fade out/pause everything
      if (masterGainRef.current && audioCtxRef.current) {
        masterGainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.3);
      }
      if (htmlAudioRef.current) {
        htmlAudioRef.current.pause();
      }
      
      setTimeout(() => {
        stopAllPlayback();
        setIsPlaying(false);
      }, 400);
    } else {
      // Start active playback
      startActivePlayback();
      setIsPlaying(true);
    }
  };

  const parsed = activeSound ? parseAudioUrl(activeSound.url) : { type: "procedural" as const };
  const isEmbed = parsed.type === "spotify" || parsed.type === "youtube" || parsed.type === "soundcloud";

  return (
    <>
      {/* Hidden Embedded Music Player for background streaming to satisfy aesthetic design requirements */}
      {isPlaying && isEmbed && parsed.embedUrl && (
        <div className="absolute w-0 h-0 overflow-hidden pointer-events-none opacity-0" aria-hidden="true">
          <iframe
            src={parsed.embedUrl}
            width="100%"
            height="1"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Song picker popover list */}
      {showSongPicker && (
        <>
          {/* Backdrop to close click-outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowSongPicker(false)} 
          />
          <div className="fixed bottom-[68px] right-6 z-50 w-60 max-h-56 overflow-y-auto bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-neutral-200 dark:border-zinc-800 p-2 rounded-xl shadow-xl animate-fade-in select-none space-y-1">
            <div className="text-[8px] font-mono text-neutral-400 dark:text-zinc-500 uppercase tracking-widest px-1.5 py-1 flex items-center gap-1 border-b border-neutral-100 dark:border-zinc-900 mb-1">
              <Music size={10} />
              <span>Select Soundtrack</span>
            </div>
            {allSounds.map((sound) => (
              <button
                key={sound.id}
                onClick={() => handleSelectSound(sound)}
                className={`w-full text-left px-2 py-1.5 rounded text-[9px] font-mono uppercase tracking-wider transition-colors flex items-center justify-between ${
                  activeSound?.id === sound.id
                    ? "bg-neutral-100 dark:bg-zinc-900 text-neutral-900 dark:text-white font-bold"
                    : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-zinc-900/40 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <span className="truncate mr-2">{sound.name}</span>
                {activeSound?.id === sound.id && <Check size={10} className="shrink-0 text-neutral-900 dark:text-white" />}
              </button>
            ))}
            {allSounds.length === 0 && (
              <p className="text-[8px] font-mono text-neutral-400 uppercase text-center py-2">No soundtracks found</p>
            )}
          </div>
        </>
      )}

      {/* Main control button bar */}
      <div
        id="shailora-sound-toggle"
        className="fixed bottom-6 right-6 z-40 flex items-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-black/80 backdrop-blur-md text-neutral-800 dark:text-neutral-200 transition-all duration-300 shadow-sm text-xs font-mono tracking-widest hover:border-neutral-400 dark:hover:border-neutral-600 select-none"
      >
        {/* Toggle play/mute button on the left */}
        <button
          onClick={handleToggleSound}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-l-full text-[9px] font-mono uppercase tracking-widest group border-r border-neutral-100 dark:border-neutral-900/50 cursor-pointer"
          aria-label={isPlaying ? "Mute ambient audio" : "Unmute ambient audio"}
        >
          <span className="relative flex h-2 w-2">
            {isPlaying && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? "bg-neutral-800 dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"}`}></span>
          </span>
          
          <span className="opacity-60 group-hover:opacity-100 transition-opacity uppercase text-[9px] font-medium max-w-[100px] truncate">
            {isPlaying ? `${activeSound?.name || "ON"}` : "Ambient OFF"}
          </span>
          
          {isPlaying ? (
            <Volume2 size={13} className="text-neutral-600 dark:text-neutral-400" />
          ) : (
            <VolumeX size={13} className="text-neutral-400 dark:text-neutral-600" />
          )}
        </button>

        {/* Small arrow to change tracks on the right */}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            setShowSongPicker(!showSongPicker);
            if (!showSongPicker) {
              await loadAllSounds();
            }
          }}
          className="p-2.5 pr-4 pl-3 rounded-r-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
          title="Change Soundtrack"
        >
          <ChevronUp size={12} className={`transition-transform duration-300 ${showSongPicker ? "rotate-180" : ""}`} />
        </button>
      </div>
    </>
  );
}
