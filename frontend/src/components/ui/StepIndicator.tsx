// steps: [{ label: string }]
// currentStep: 0-indexed active step number
export default function StepIndicator({ steps, currentStep }) {
  const trackPct =
    steps.length > 1
      ? Math.round((currentStep / (steps.length - 1)) * 100)
      : 0;

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <div className="flex items-center justify-between relative">
        {/* Grey track */}
        <div className="absolute left-0 top-4 -translate-y-1/2 w-full h-1 bg-surface-container-high rounded-full z-0" />
        {/* Filled track */}
        <div
          className="absolute left-0 top-4 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-500"
          style={{ width: `${trackPct}%` }}
        />
        {steps.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={i} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 border-white shadow-sm transition-all duration-300 ${
                  done
                    ? "bg-primary text-on-primary"
                    : active
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {done ? (
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check
                  </span>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[11px] font-medium absolute top-9 whitespace-nowrap transition-colors duration-300 ${
                  active ? "text-primary" : done ? "text-on-surface-variant" : "text-on-surface-variant/50"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
