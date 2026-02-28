import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TutorialContentProps {
  onComplete?: () => void;
  className?: string;
}

export const TutorialContent: React.FC<TutorialContentProps> = ({
  onComplete,
  className = "",
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Welcome to Storyboard",
      description: "Create beautiful animations in minutes on our canvas",
      videoUrl: "/demo/tutorial0.mp4",
      tip: "Get started by exploring the canvas!",
    },
    {
      title: "Upload an image and annotate",
      description: "Select any image—use our canvas to annotate edits",
      videoUrl: "/demo/tutorial1.mp4",
      tip: "Circle areas of the image and write edits!",
    },
    {
      title: "Or draw from scratch",
      description: "Create your own world—use our tools to draw sketches",
      videoUrl: "/demo/tutorial2.mp4",
      tip: "Use the improve frame button to enhance sketches!",
    },
    {
      title: "Prompt and generate",
      description: "Craft a prompt and then generate the next frame",
      videoUrl: "/demo/tutorial3.mp4",
      tip: "Make sure the prompt is accurate to what you want to animate!",
    },
    {
      title: "Create a whole story",
      description:
        "Continue iterating over the last frame of the previous frame—create a storyboard tree.",
      videoUrl: "/demo/tutorial4.mp4",
      tip: "Our global context handles the transitions!",
    },
    {
      title: "Merge and export",
      description: "You're all set! Select a frame and merge",
      videoUrl: "/demo/tutorial5.mp4",
      tip: "The algorithm merges the whole story—from beginning to the selected frame!",
    },
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete?.();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div
      className={`grid md:grid-cols-2 gap-0 h-full bg-white rounded-xl overflow-hidden border-2 border-black ${className}`}
      style={{ boxShadow: "5px 5px 0 #0f0f0f" }}
    >
      <div className="bg-gray-100 p-8 flex items-center justify-center min-h-[300px] md:min-h-auto">
        <div className="w-full aspect-video bg-white rounded-lg overflow-hidden border-2 border-black/20 relative">
          <video
            key={currentSlide}
            className="w-full h-full object-cover absolute inset-0"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src={slides[currentSlide].videoUrl} type="video/mp4" />
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <span className="text-black/30 font-mono font-bold text-4xl">?</span>
            </div>
          </video>
        </div>
      </div>

      <div className="p-8 md:p-12 flex flex-col">
        {/* Progress Bars */}
        <div className="flex gap-2 mb-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 border border-black/10 ${
                index === currentSlide
                  ? "w-12 bg-black"
                  : index < currentSlide
                  ? "w-1.5 bg-black/40"
                  : "w-1.5 bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-3xl md:text-4xl font-bold font-mono text-black mb-4">
            {slides[currentSlide].title}
          </h2>
          <p className="text-lg text-gray-600 mb-6 leading-relaxed font-mono">
            {slides[currentSlide].description}
          </p>
          {/* Tip Box */}
          <div className="inline-flex items-center gap-2 px-4 py-3 bg-[#FFD700]/20 rounded-lg text-sm text-black self-start mb-4 md:mb-0 border-2 border-[#FFD700]">
            <span className="font-bold font-mono">
              TIP: {slides[currentSlide].tip}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mt-8">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold font-mono text-black hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent cursor-pointer border-2 border-transparent hover:border-black/10"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="hidden lg:block text-sm text-gray-400 font-bold font-mono tracking-widest">
            {currentSlide + 1} / {slides.length}
          </div>

          <button
            onClick={nextSlide}
            className="flex items-center gap-2 px-8 py-3 rounded-lg font-bold font-mono text-white bg-black border-2 border-black transition-colors cursor-pointer hover:bg-gray-900 hover:-translate-y-0.5"
            style={{ boxShadow: "3px 3px 0 #FFD700" }} // Accent shadow
          >
            {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
            {currentSlide < slides.length - 1 && (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="lg:hidden text-center mt-4 text-sm text-gray-400 font-bold font-mono tracking-widest">
          {currentSlide + 1} / {slides.length}
        </div>
      </div>
    </div>
  );
};

export const TutorialSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="py-10 bg-transparent relative z-10">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold font-bentani text-black mb-4">
              Step by Step
            </h2>
            <p className="text-xl text-gray-600 font-mono max-w-2xl mx-auto">
              Bring your ideas to <span className="italic">life</span> with{" "}
              <span className="font-orbitron font-bold text-[#FFD700]">StoryBoard.</span>
            </p>
          </div>

          <TutorialContent
            onComplete={() => navigate("/app")}
            className=""
          />
        </div>
      </div>
    </section>
  );
};

export default TutorialSection;