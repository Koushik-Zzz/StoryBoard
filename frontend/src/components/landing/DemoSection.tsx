import React, { useState, useEffect } from "react";
import { PenTool, Layers, Film } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";

const DemoSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState("0");

  const durations: Record<string, number> = {
    "0": 5000, // 5s
    "1": 3000, // 3s
    "2": 6000, // 6s
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => ((parseInt(prev) + 1) % 3).toString());
    }, durations[activeStep]);

    return () => clearInterval(interval);
  }, [activeStep]);

  const steps = [
    {
      value: "0",
      title: "Sketch Input",
      desc: "Draw instructions directly on your starting image.",
      icon: <PenTool className="w-6 h-6" />,
      visual: "./demo/demo.png",
      isVideo: false,
      overlay: (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox="0 0 800 450"
        >
          <path
            d="M120 260 
         Q200 180 290 220 
         T420 240 
         Q500 300 610 180
         T720 260"
            stroke="#FFD700"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1600"
            strokeDashoffset="1600"
            className="animate-[scribble_10s_ease-out_forwards]"
          />
        </svg>
      ),
    },
    {
      value: "1",
      title: "Sketch Parsing",
      desc: "Our AI interprets your strokes and text prompts.",
      icon: <Layers className="w-6 h-6" />,
      visual: "./demo/demo-blur.png",
      isVideo: false,
      overlay: (
        <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm z-10">
          <div
            className="flex flex-col items-center gap-4 p-6 bg-white border-2 border-black rounded-xl"
            style={{ boxShadow: "4px 4px 0 #000" }}
          >
            <div className="w-12 h-12 border-4 border-black border-t-[#FFD700] rounded-full animate-spin" />
            <span className="font-mono font-bold text-black tracking-widest uppercase text-sm">
              Processing...
            </span>
          </div>
        </div>
      ),
    },
    {
      value: "2",
      title: "Video Generation",
      desc: "5s clip is generated and we automatically create the next starting frame",
      icon: <Film className="w-6 h-6" />,
      visual: "./demo/demo-1080p.mp4",
      isVideo: true,
      overlay: (
        <>
          <div
            className="absolute bottom-6 right-6 z-20 flex items-center gap-3 bg-white px-4 py-2 rounded-lg border-2 border-black"
            style={{ boxShadow: "4px 4px 0 #000" }}
          >
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse border border-black/20" />
            <span className="text-black text-sm font-bold font-mono tracking-wider">
              REC 00:04:67
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              const vid = document.getElementById("demo-video") as HTMLVideoElement;
              if (vid) vid.muted = !vid.muted;
            }}
            className="absolute top-16 right-6 z-20 bg-white text-black border-2 border-black px-4 py-2 rounded-lg text-sm font-bold font-mono transition-transform hover:-translate-y-1 hover:bg-gray-50 cursor-pointer"
            style={{ boxShadow: "3px 3px 0 #000" }}
          >
            Mute / Unmute
          </button>
        </>
      ),
    },
  ];

  return (
    <section id="demo" className="py-24 relative overflow-visible">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold font-mono text-black mb-6 leading-tight">
            From Static to Cinematic. <br />
            <span className="font-orbitron font-bold text-[#FFD700] px-2 text-5xl md:text-6xl lg:text-7xl">
              In Seconds.
            </span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto font-mono text-pretty leading-relaxed">
            StoryBoard parses your hand-drawn context, interprets intent with
            artificial intelligence, and generates fluid animations.
          </p>
        </div>

        {/* Radix Tabs Implementation */}
        <Tabs.Root
          value={activeStep}
          onValueChange={setActiveStep}
          orientation="vertical"
          className="grid md:grid-cols-12 gap-8 items-center"
        >
          {/* Steps Sidebar / Tab List */}
          <Tabs.List className="md:col-span-4 flex flex-col gap-4">
            {steps.map((step, idx) => {
              const isActive = activeStep === step.value;
              return (
                <Tabs.Trigger
                  key={step.value}
                  value={step.value}
                  className={`text-left p-6 rounded-xl transition-all duration-300 outline-none relative overflow-hidden border-2 ${
                    isActive
                      ? "bg-[#FFD700] border-black text-black z-10"
                      : "bg-white border-black/20 hover:border-black text-gray-500 hover:text-black hover:-translate-y-1"
                  }`}
                  style={isActive ? { boxShadow: "6px 6px 0 #0f0f0f" } : {}}
                >
                  {/* Step Number Background */}
                  <div
                    className={`absolute -top-4 -right-4 text-[100px] font-bold font-mono leading-none transition-all duration-300 ${
                      isActive
                        ? "text-black/5 scale-100"
                        : "text-black/5 scale-90"
                    }`}
                  >
                    0{idx + 1}
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 ${
                          isActive
                            ? "bg-white border-black text-black"
                            : "bg-gray-100 border-transparent text-gray-400"
                        }`}
                        style={isActive ? { boxShadow: "2px 2px 0 #000" } : {}}
                      >
                        {step.icon}
                      </div>
                      <div
                        className={`text-sm font-mono font-bold tracking-wider ${
                          isActive ? "text-black" : "text-gray-400"
                        }`}
                      >
                        STEP {idx + 1}
                      </div>
                    </div>

                    <h3
                      className={`text-2xl font-bold font-mono mb-2 ${
                        isActive ? "text-black" : "text-gray-500"
                      }`}
                    >
                      {step.title}
                    </h3>

                    <p
                      className={`text-sm leading-relaxed font-mono ${
                        isActive ? "text-black/80" : "text-gray-400"
                      }`}
                    >
                      {step.desc}
                    </p>

                    {/* Brutalist Progress Bar */}
                    {isActive && (
                      <div className="w-full h-3 bg-white mt-6 rounded-full overflow-hidden border-2 border-black">
                        <div
                          className="h-full bg-black"
                          style={{
                            width: "100%",
                            animation: `widthBar ${
                              durations[step.value]
                            }ms linear`,
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>

          {/* Visual Preview / Tab Content */}
          <div className="md:col-span-8">
            {steps.map((step) => (
              <Tabs.Content
                key={step.value}
                value={step.value}
                className="outline-none animate-in fade-in slide-in-from-bottom-4 duration-500 h-full"
              >
                <div
                  className="relative rounded-2xl overflow-hidden border-2 border-black bg-white aspect-video group flex flex-col"
                  style={{ boxShadow: "8px 8px 0 #0f0f0f" }}
                >
                  {/* Brutalist Browser Window Chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-black bg-white z-20">
                    <div className="w-3 h-3 rounded-full bg-red-400 border border-black/20" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400 border border-black/20" />
                    <div className="w-3 h-3 rounded-full bg-green-400 border border-black/20" />
                  </div>

                  <div className="relative flex-1 w-full bg-gray-100">
                    {step.isVideo ? (
                      <video
                        id="demo-video"
                        ref={(el) => {
                          if (el) {
                            el.oncanplay = () => {
                              el.play()
                                .then(() => {
                                  el.muted = true;
                                })
                                .catch(() => {
                                  el.muted = true;
                                  el.play();
                                });
                            };
                          }
                        }}
                        src={step.visual}
                        autoPlay
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={step.visual}
                        alt={step.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}

                    {step.overlay}
                  </div>
                </div>
              </Tabs.Content>
            ))}
          </div>
        </Tabs.Root>
      </div>

      <style>{`
        @keyframes widthBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes scribble {
          from { stroke-dashoffset: 1600; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </section>
  );
};

export default DemoSection;