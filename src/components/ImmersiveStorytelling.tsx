import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  BookOpen
} from "lucide-react";
import { Project } from "../types";

interface ImmersiveStorytellingProps {
  project: Project;
  onHoverStart?: (label: string) => void;
  onHoverEnd?: () => void;
}

export default function ImmersiveStorytelling({
  project,
  onHoverStart,
  onHoverEnd,
}: ImmersiveStorytellingProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  // Drag tracking refs for swipe gestures on mobile
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);

  const getContrastColor = (hex?: string) => {
    if (!hex || hex === "transparent") return "text-neutral-700 dark:text-neutral-300";
    try {
      const color = hex.replace("#", "");
      if (color.length === 3) {
        const r = parseInt(color.substring(0, 1) + color.substring(0, 1), 16);
        const g = parseInt(color.substring(1, 2) + color.substring(1, 2), 16);
        const b = parseInt(color.substring(2, 3) + color.substring(2, 3), 16);
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;
        return yiq >= 128 ? "text-neutral-950" : "text-neutral-50";
      }
      const r = parseInt(color.substring(0, 2), 16);
      const g = parseInt(color.substring(2, 4), 16);
      const b = parseInt(color.substring(4, 6), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? "text-neutral-950" : "text-neutral-50";
    } catch (e) {
      return "text-neutral-700 dark:text-neutral-300";
    }
  };

  const getTranslucentColor = (hex?: string, alpha = 0.15) => {
    if (!hex || hex === "transparent") return "rgba(120, 120, 120, 0.05)";
    try {
      const color = hex.replace("#", "");
      let r = 0, g = 0, b = 0;
      if (color.length === 3) {
        r = parseInt(color.substring(0, 1) + color.substring(0, 1), 16);
        g = parseInt(color.substring(1, 2) + color.substring(1, 2), 16);
        b = parseInt(color.substring(2, 3) + color.substring(2, 3), 16);
      } else if (color.length === 6) {
        r = parseInt(color.substring(0, 2), 16);
        g = parseInt(color.substring(2, 4), 16);
        b = parseInt(color.substring(4, 6), 16);
      } else {
        return "rgba(120, 120, 120, 0.05)";
      }
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch (e) {
      return "rgba(120, 120, 120, 0.05)";
    }
  };

  // Helper to extract embed info for various video platforms and formats
  const getEmbedInfo = (url: string) => {
    if (!url) return { type: 'direct' as const, embedUrl: '' };
    const urlLower = url.toLowerCase();

    // Highly robust YouTube extractor supporting watch, shorts, share, live, embed, and 11-char IDs
    const getYouTubeId = (rawUrl: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]*).*/;
      const match = rawUrl.match(regExp);
      if (match && match[2].length === 11) {
        return match[2];
      }
      if (rawUrl.trim().length === 11 && !rawUrl.includes('/') && !rawUrl.includes('.')) {
        return rawUrl.trim();
      }
      return null;
    };

    const ytId = getYouTubeId(url);
    if (ytId) {
      return { 
        type: 'youtube' as const, 
        embedUrl: `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}` 
      };
    }

    // Vimeo
    const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return { 
        type: 'vimeo' as const, 
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1` 
      };
    }

    // Instagram
    if (urlLower.includes("instagram.com")) {
      const baseUrl = url.split('?')[0].replace(/\/$/, "");
      return { 
        type: 'instagram' as const, 
        embedUrl: `${baseUrl}/embed/` 
      };
    }

    // Facebook
    if (urlLower.includes("facebook.com") || urlLower.includes("fb.watch")) {
      const isVideo = urlLower.includes("/videos/") || urlLower.includes("/watch") || urlLower.includes("fb.watch");
      const plugin = isVideo ? "video.php" : "post.php";
      return { 
        type: 'facebook' as const, 
        embedUrl: `https://www.facebook.com/plugins/${plugin}?href=${encodeURIComponent(url)}&show_text=0&show_captions=true&autoplay=true` 
      };
    }

    // TikTok
    if (urlLower.includes("tiktok.com")) {
      const ttMatch = url.match(/video\/(\d+)/i);
      if (ttMatch && ttMatch[1]) {
        return { 
          type: 'tiktok' as const, 
          embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}` 
        };
      }
    }

    // Direct Video file check
    const isDirectVideo = urlLower.endsWith(".mp4") || urlLower.endsWith(".webm") || urlLower.endsWith(".ogg") || urlLower.endsWith(".mov");
    if (isDirectVideo) {
      return { 
        type: 'direct_video' as const, 
        embedUrl: url 
      };
    }

    return { 
      type: 'direct' as const, 
      embedUrl: url 
    };
  };

  // Construct narrative slides based strictly on the configured spatialSlides
  const slides = React.useMemo(() => {
    const list = [];

    // Filter spatialSlides to ONLY include those that were explicitly uploaded/configured under "Spatial Logic Interactive Slides" in the CMS.
    const customSlides = project.spatialSlides || [];

    if (customSlides.length > 0) {
      customSlides.forEach((item, index) => {
        list.push({
          id: `spatial-slide-${item.id || index}-${index}`,
          step: String(index + 1).padStart(2, "0"),
          topic: item.type === "video" ? "SPATIAL MEDIA" : "SPATIAL DIAGRAM",
          title: item.title || `Spatial Study #${index + 1}`,
          leftHeader: "Curator Narrative",
          leftContent: item.description || `This visual asset represents the custom spatial details and organization of ${project.title}.`,
          mediaType: "image" as const,
          mediaUrl: item.url,
          isVideo: item.type === "video",
          icon: BookOpen
        });
      });
    } else {
      // Fallback single slide representing only the Spatial Logic section text & hero image
      list.push({
        id: "spatial-logic-fallback",
        step: "01",
        topic: "SPATIAL GENESIS",
        title: "Spatial Logic & Geometry",
        leftHeader: "Spatial Philosophy",
        leftContent: project.conceptText || `The spatial organization of ${project.title} centers on the precise intersection of program requirements and sculptural form. Massing is carved to optimize deep daylight penetration, passive ventilation channels, and clear structural spans, resulting in a series of continuous volumes that balance shelter with expansive views.`,
        mediaType: "image" as const,
        mediaUrl: project.heroImage,
        icon: Layers
      });
    }

    return list;
  }, [project]);

  // Ensure activeSlide index stays within bounds if slides list size changes
  useEffect(() => {
    if (activeSlide >= slides.length) {
      setActiveSlide(0);
    }
  }, [slides.length, activeSlide]);

  // High performance, non-blocking scroll and zoom tracking utilizing CSS properties directly
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!sectionRef.current) {
            ticking = false;
            return;
          }

          const rect = sectionRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          
          // Calculate center positions
          const elementCenter = rect.top + rect.height / 2;
          const viewportCenter = viewportHeight / 2;
          
          // The activation range (how close we need to be to trigger expansion)
          const maxDistance = viewportHeight * 0.6;
          const distance = Math.abs(elementCenter - viewportCenter);
          
          let progress = 0;
          if (distance < maxDistance) {
            const rawProgress = 1 - distance / maxDistance;
            // Cubic ease-in curve for a smoother transition
            progress = Math.pow(rawProgress, 1.8);
          }

          // Directly apply styles to DOM nodes bypassing React re-renders to achieve 120fps smooth transition
          if (cardRef.current) {
            cardRef.current.style.transform = `scale(${1 + progress * 0.22})`;
            cardRef.current.style.borderRadius = `${1.5 - progress * 0.6}rem`;
            if (progress > 0.05) {
              cardRef.current.style.boxShadow = `0 25px 60px -15px rgba(0, 0, 0, ${progress * 0.75})`;
            } else {
              cardRef.current.style.boxShadow = "none";
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    
    // Initial paint calculation
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  // Swipe gesture trackers for mobile and drag tracking
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current === null || dragStartY.current === null || slides.length <= 1) return;

    const diffX = e.clientX - dragStartX.current;
    const diffY = e.clientY - dragStartY.current;

    // Detect dominant horizontal swipe/drag
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 45) {
      if (diffX < 0) {
        // Drag left -> Next Slide
        setActiveSlide((prev) => Math.min(slides.length - 1, prev + 1));
      } else {
        // Drag right -> Prev Slide
        setActiveSlide((prev) => Math.max(0, prev - 1));
      }
    }

    dragStartX.current = null;
    dragStartY.current = null;
  };

  const currentSlide = slides[activeSlide] || slides[0];

  const getWriteupBgColor = () => {
    if (project.conceptBgColor && project.conceptBgColor !== "transparent") {
      return getTranslucentColor(project.conceptBgColor, 0.18);
    }
    return "rgba(228, 228, 231, 0.05)";
  };

  return (
    <div 
      ref={sectionRef}
      className="w-full relative py-20 border-t border-neutral-100 dark:border-neutral-800 print:hidden overflow-hidden transition-colors duration-300"
    >
      <div className="relative max-w-7xl mx-auto px-6 md:px-12 z-10 flex flex-col gap-8">
        
        {/* Header on top */}
        <div className="space-y-2 text-left">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-400 block mb-1">
            02 / Spatial Logic
          </span>
        </div>

        {/* First Section below heading: Our Interactive Adaptive Media Stage */}
        <div 
          ref={cardRef}
          className="w-full h-[320px] md:h-[480px] lg:h-[550px] relative rounded-2xl overflow-hidden shadow-xl bg-neutral-100 dark:bg-zinc-950 select-none border border-neutral-200/40 dark:border-white/5 group transition-transform duration-100 ease-out"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          {/* Animated Media Presenter Inside Card */}
          <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={`slide-media-${activeSlide}`}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 w-full h-full"
              >
                {(() => {
                  const embedInfo = getEmbedInfo(currentSlide.mediaUrl);
                  if (embedInfo.type === 'direct_video' || (currentSlide.isVideo && embedInfo.type === 'direct')) {
                    return (
                      <div className="w-full h-full bg-black relative flex items-center justify-center">
                        <video
                          src={currentSlide.mediaUrl}
                          controls
                          autoPlay
                          muted
                          loop
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  } else if (embedInfo.type !== 'direct') {
                    return (
                      <div className="w-full h-full bg-black relative">
                        <iframe
                          src={embedInfo.embedUrl}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    );
                  } else {
                    return (
                      <>
                        <img
                          src={currentSlide.mediaUrl}
                          alt={currentSlide.title}
                          className="w-full h-full object-cover select-none pointer-events-none"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                      </>
                    );
                  }
                })()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Left and Right Navigational Chevron Buttons Overlay */}
          {slides.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlide((prev) => Math.max(0, prev - 1));
                  if (onHoverStart) onHoverStart("PREVIOUS CONCEPT");
                }}
                disabled={activeSlide === 0}
                className={`p-3 rounded-full bg-black/60 hover:bg-black/95 text-white/90 border border-white/10 backdrop-blur-md hover:scale-105 transition-all pointer-events-auto cursor-pointer ${
                  activeSlide === 0 ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                }`}
                title="Previous Slide"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlide((prev) => Math.min(slides.length - 1, prev + 1));
                  if (onHoverStart) onHoverStart("NEXT CONCEPT");
                }}
                disabled={activeSlide === slides.length - 1}
                className={`p-3 rounded-full bg-black/60 hover:bg-black/95 text-white/90 border border-white/10 backdrop-blur-md hover:scale-105 transition-all pointer-events-auto cursor-pointer ${
                  activeSlide === slides.length - 1 ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                }`}
                title="Next Slide"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Dynamic visual slider indicator dots overlay at bottom center */}
          {slides.length > 1 && (
            <div className="absolute bottom-6 inset-x-0 flex justify-center gap-1.5 z-20 pointer-events-none">
              {slides.map((_, idx) => (
                <button
                  key={`slide-dot-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSlide(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-500 pointer-events-auto ${
                    activeSlide === idx ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Below Image: Adaptive Dynamic Write-up Block */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={`slide-text-${activeSlide}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full p-8 md:p-12 rounded-2xl border border-neutral-200/40 dark:border-white/10 transition-all duration-500 text-left shadow-md backdrop-blur-md relative overflow-hidden"
            style={{
              backgroundColor: getWriteupBgColor(),
            }}
          >
            <div className="space-y-4">
              <p className="leading-relaxed font-sans text-justify text-sm md:text-base text-neutral-800 dark:text-neutral-200">
                {currentSlide.leftContent}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
