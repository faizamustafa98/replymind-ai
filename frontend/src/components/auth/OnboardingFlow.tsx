"use client";
import { useState } from "react";
import StepIndicator from "@/src/components/ui/StepIndicator";
import { completeOnboarding } from "@/src/lib/actions/verify";
import Step1BusinessProfile from "@/src/components/auth/steps/Step1BusinessProfile";
import Step2Documents from "@/src/components/auth/steps/Step2Documents";
import Step3Channels from "@/src/components/auth/steps/Step3Channels";

const STEPS = [
  { label: "Business Profile" },
  { label: "Documents" },
  { label: "Channels" },
];

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});

  const handleNext = async (stepData) => {
    setData((prev) => ({ ...prev, ...stepData }));
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    // Onboarding complete → record it before leaving, otherwise the setup gate
    // in proxy.ts sends them straight back here.
    await completeOnboarding();
    // Full reload so the gate re-reads the updated user metadata.
    window.location.href = "/inbox";
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="min-h-screen bg-surface flex flex-col overflow-x-hidden relative">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/8 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full flex justify-between items-center px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <img src="/logo-mark.svg" alt="ReplyMind" className="h-8 w-8" />
          <span className="text-[18px] font-medium text-on-surface tracking-tight">ReplyMind</span>
        </div>
        <button className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
          <span className="material-symbols-outlined text-[22px]">help_outline</span>
        </button>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Step indicator */}
        <div className="w-full max-w-[600px] mb-12 px-4">
          <StepIndicator steps={STEPS} currentStep={step} />
        </div>

        {/* Card */}
        <div className="w-full max-w-[600px] bg-surface-container-lowest rounded-2xl shadow-[0px_4px_24px_rgba(0,0,0,0.07)] border border-outline-variant/20 p-8">
          {step === 0 && <Step1BusinessProfile onNext={handleNext} />}
          {step === 1 && <Step2Documents onNext={handleNext} onBack={handleBack} />}
          {step === 2 && <Step3Channels onNext={handleNext} onBack={handleBack} />}
        </div>

        {/* Step counter */}
        <p className="mt-6 text-xs text-on-surface-variant/50">
          Step {step + 1} of {STEPS.length}
        </p>
      </main>
    </div>
  );
}
