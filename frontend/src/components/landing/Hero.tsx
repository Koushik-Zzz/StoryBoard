import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MousePointer2, Play } from "lucide-react";
import gsap from "gsap";

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const mainTextRef = useRef<HTMLDivElement>(null);
  const subtextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();

    // Animate "Storyboard Your Vision" from top to bottom
    tl.from(mainTextRef.current, {
      opacity: 0,
      y: -100,
      duration: 1,
      ease: "power2.out",
    });

    // Animate "Where stories take shape." from top to bottom with delay
    tl.from(
      subtextRef.current,
      {
        opacity: 0,
        y: -100,
        duration: 1,
        ease: "power2.out",
      },
      "-=0.5" // Start 0.5s before the previous animation ends
    );
  }, []);

  return (
    <section className="relative pt-40 pb-10 overflow-hidden">
      <style>{`
        @keyframes dotGlow {
          0%, 100% {
            box-shadow: 0 0 4px rgba(255, 165, 0, 0.6);
          }
          50% {
            box-shadow: 0 0 12px rgba(255, 165, 0, 0.9), 0 0 20px rgba(255, 165, 0, 0.6);
          }
        }
        .dot-glow {
          animation: dotGlow 2s ease-in-out infinite;
        }
        @keyframes popUp {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1.08);
          }
        }
        .popup-btn:hover {
          animation: popUp 0.3s ease-out forwards;
        }
      `}</style>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* V0 Version Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-black/15 bg-white mb-10">
            <span className="w-2 h-2 rounded-full bg-orange-400 dot-glow" />
            <span className="text-sm font-mono font-bold text-black tracking-wide uppercase">
              StoryBoard Live
            </span>
          </div>

          {/* Merged Main Text with V0 Styling */}
          <h1 className="text-5xl md:text-7xl font-bold font-bentani text-black mb-8 leading-tight text-balance">
           <span className="font-orbitron ">Storyboard</span>  Your Vision <br />
            {/* Preserved your Ananda script font highlight */}
            <span className="font-bentani font-bold text-[#FFD700] px-2">
              Where stories take shape.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 mb-12 leading-relaxed max-w-2xl mx-auto text-pretty font-mono">
            Create a storyboard by drawing instructions on any image. StoryBoard
            turns your rough sketches into context-aware video clips that extend
            infinitely.
          </p>

          {/* V0 Action Buttons mapped to Main Logic */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/app")}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#FFD700] text-black font-bold font-mono rounded-lg border-2 border-black transition-all duration-200 group cursor-pointer hover:brightness-110 popup-btn"
              style={{ boxShadow: "4px 4px 0 #0f0f0f" }}
            >
              Start Creating
              <MousePointer2 className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-bold font-mono rounded-lg border-2 border-black transition-all duration-200 group cursor-pointer hover:bg-gray-50 popup-btn"
              style={{ boxShadow: "4px 4px 0 #0f0f0f" }}
            >
              <Play className="w-4 h-4" />
              Watch Demo
            </button>
          </div>
        </div>

        <div className="mt-20 max-w-5xl mx-auto relative">
          <div
            className="absolute -top-6 -right-6 w-24 h-24 text-black/10 font-mono text-8xl font-bold select-none pointer-events-none z-[-1]"
            aria-hidden="true"
          >
          
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;