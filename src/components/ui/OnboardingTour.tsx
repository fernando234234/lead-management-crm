"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";

export interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
}

interface OnboardingTourProps {
  steps: TourStep[];
  tourKey: string; // Unique key for localStorage
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingTour({
  steps,
  tourKey,
  onComplete,
  onSkip,
}: OnboardingTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Check if tour was already completed
  useEffect(() => {
    const completed = localStorage.getItem(`tour_completed_${tourKey}`);
    if (!completed) {
      // Small delay to let the page render
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [tourKey]);

  // Update target element position
  const updateTargetPosition = useCallback(() => {
    if (!isActive || !steps[currentStep]) return;
    
    const target = document.querySelector(steps[currentStep].target);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);
      
      // Scroll target into view if needed
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isActive, currentStep, steps]);

  useEffect(() => {
    updateTargetPosition();
    
    // Update on resize/scroll
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition);
    
    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
    };
  }, [updateTargetPosition]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`tour_completed_${tourKey}`, "true");
    setIsActive(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(`tour_completed_${tourKey}`, "true");
    setIsActive(false);
    onSkip?.();
  };

  if (!isActive || !steps[currentStep]) return null;

  const step = steps[currentStep];
  const placement = step.placement || "bottom";

  // Calculate tooltip position
  const getTooltipPosition = () => {
    if (!targetRect) return { top: "50%", left: "50%" };

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;

    switch (placement) {
      case "top":
        return {
          top: targetRect.top - tooltipHeight - padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case "bottom":
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case "left":
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - tooltipWidth - padding,
        };
      case "right":
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.right + padding,
        };
      default:
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
    }
  };

  const tooltipPos = getTooltipPosition();

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {/* Dark overlay with spotlight cutout */}
        <div
          className="absolute inset-0 bg-black/50 transition-all duration-300"
          style={{
            clipPath: targetRect
              ? `polygon(
                  0% 0%, 
                  0% 100%, 
                  ${targetRect.left - 8}px 100%, 
                  ${targetRect.left - 8}px ${targetRect.top - 8}px, 
                  ${targetRect.right + 8}px ${targetRect.top - 8}px, 
                  ${targetRect.right + 8}px ${targetRect.bottom + 8}px, 
                  ${targetRect.left - 8}px ${targetRect.bottom + 8}px, 
                  ${targetRect.left - 8}px 100%, 
                  100% 100%, 
                  100% 0%
                )`
              : undefined,
          }}
        />

        {/* Spotlight border */}
        {targetRect && (
          <div
            className="absolute border-2 border-admin rounded-lg transition-all duration-300 animate-pulse"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        className="fixed z-[9999] w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-5 pointer-events-auto transition-all duration-300"
        style={{
          top: typeof tooltipPos.top === "number" ? `${tooltipPos.top}px` : tooltipPos.top,
          left: typeof tooltipPos.left === "number" ? `${tooltipPos.left}px` : tooltipPos.left,
        }}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Salta tour"
        >
          <X size={18} />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-3">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentStep
                  ? "w-6 bg-admin"
                  : index < currentStep
                  ? "w-3 bg-admin/50"
                  : "w-3 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
        <p className="text-sm text-gray-600 mb-4">{step.content}</p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Salta tour
          </button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft size={16} />
                Indietro
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-admin hover:bg-admin/90 rounded-lg transition-colors"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Check size={16} />
                  Fine
                </>
              ) : (
                <>
                  Avanti
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook to manually trigger tour
export function useOnboardingTour(tourKey: string) {
  const startTour = () => {
    localStorage.removeItem(`tour_completed_${tourKey}`);
    window.location.reload();
  };

  const resetTour = () => {
    localStorage.removeItem(`tour_completed_${tourKey}`);
  };

  return { startTour, resetTour };
}
