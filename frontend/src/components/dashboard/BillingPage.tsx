"use client";
import { useState } from "react";
import CheckoutPage from "@/src/components/dashboard/CheckoutPage";
import Modal from "@/src/components/ui/Modal";

const PLANS = [
  {
    name: "Free",
    price: 0,
    messages: "500 msg/mo",
    messagesTotal: 500,
    features: ["1 channel", "Basic AI drafts", "Community support"],
  },
  {
    name: "Growth",
    price: 19,
    messages: "5,000 msg/mo",
    messagesTotal: 5000,
    features: ["3 channels", "AI drafts + auto-send", "Priority support"],
  },
  {
    name: "Enterprise",
    price: 149,
    messages: "Unlimited",
    messagesTotal: Infinity,
    features: ["Unlimited channels", "Custom AI persona", "Dedicated support"],
  },
];

const MESSAGES_USED = 3240;
const RENEWS_ON = "August 1, 2026";

const INITIAL_CARD = {
  brand: "Visa",
  last4: "4242",
  expires: "12/27",
};

function FieldLabel({ children }) {
  return (
    <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-[0.06em] mb-1.5">
      {children}
    </p>
  );
}

export default function BillingPage() {
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [currentPlanName, setCurrentPlanName] = useState("Growth");
  const [card, setCard] = useState(INITIAL_CARD);
  // { mode: "upgrade" | "update-card", plan } — non-null renders the checkout page
  const [checkout, setCheckout] = useState(null);
  const [downgradeTarget, setDowngradeTarget] = useState(null);

  const currentPlan = PLANS.find((p) => p.name === currentPlanName);
  const unlimited = !Number.isFinite(currentPlan.messagesTotal);

  const usagePct = unlimited
    ? 0
    : Math.round((MESSAGES_USED / currentPlan.messagesTotal) * 100);

  const usageColor =
    usagePct >= 90
      ? "bg-error"
      : usagePct >= 70
      ? "bg-secondary"
      : "bg-primary";

  // Selecting a plan: upgrades go through checkout, downgrades ask first.
  const handlePlanClick = (plan) => {
    if (plan.name === currentPlanName) return;
    if (plan.price > currentPlan.price) {
      setCheckout({ mode: "upgrade", plan });
    } else {
      setDowngradeTarget(plan);
    }
  };

  const handleCheckoutDone = (newCard) => {
    setCard(newCard);
    if (checkout?.mode === "upgrade") setCurrentPlanName(checkout.plan.name);
    setCheckout(null);
  };

  if (checkout) {
    return (
      <CheckoutPage
        mode={checkout.mode}
        plan={checkout.plan}
        onDone={handleCheckoutDone}
        onBack={() => setCheckout(null)}
      />
    );
  }

  return (
    <div className="overflow-y-auto flex-1 px-gutter md:px-xl pb-gutter md:pb-xl pt-lg custom-scrollbar">
      <div className="max-w-3xl mx-auto flex flex-col gap-lg">
        {/* Page heading */}
        <section className="shrink-0">
          <h2 className="text-2xl font-medium text-on-surface">
            Billing &amp; Plan
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Manage your subscription, usage, and payment details.
          </p>
        </section>

        {/* ── Current Plan Card ── */}
        <div className="glass-card p-6 flex flex-col gap-6 !rounded-2xl hover:!translate-y-0 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h3 className="text-base font-medium text-on-surface">
                  {currentPlan.name} Plan
                </h3>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container">
                  Active
                </span>
              </div>
              <p className="text-sm text-on-surface-variant">
                Renews on {RENEWS_ON}
              </p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-semibold text-on-surface tracking-tight leading-tight">
                ${currentPlan.price}
              </span>
              <span className="text-sm text-on-surface-variant">/mo</span>
            </div>
          </div>

          {/* Usage bar */}
          <div className="relative z-10">
            <FieldLabel>Message Usage</FieldLabel>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-on-surface">
                {MESSAGES_USED.toLocaleString()} /{" "}
                {unlimited ? "Unlimited" : currentPlan.messagesTotal.toLocaleString()} messages
              </span>
              <span className="text-xs text-on-surface-variant">
                {unlimited ? "No message cap" : `${usagePct}% used`}
              </span>
            </div>
            <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${unlimited ? "bg-gradient-brand" : usageColor}`}
                style={{ width: unlimited ? "100%" : `${usagePct}%` }}
              />
            </div>
          </div>

          {currentPlanName !== "Enterprise" && (
            <div className="relative z-10">
              <button
                onClick={() =>
                  handlePlanClick(PLANS[PLANS.findIndex((p) => p.name === currentPlanName) + 1])
                }
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20"
              >
                <span className="material-symbols-outlined text-[18px]">
                  upgrade
                </span>
                Upgrade Plan
              </button>
            </div>
          )}
        </div>

        {/* ── Plan Tiers ── */}
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-medium text-on-surface">
            Available Plans
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {PLANS.map((plan) => {
              const isCurrent = plan.name === currentPlanName;
              return (
                <div
                  key={plan.name}
                  onClick={() => handlePlanClick(plan)}
                  className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/5 shadow-sm cursor-default"
                      : "border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low hover:border-primary/40 cursor-pointer"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-medium text-on-surface">
                        {plan.name}
                      </p>
                      {isCurrent && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      {plan.messages}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-medium text-on-surface">
                      {plan.price === 0 ? "Free" : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-xs text-on-surface-variant">/mo</span>
                    )}
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span
                          className="material-symbols-outlined text-[14px] text-primary shrink-0"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                        <span className="text-xs text-on-surface-variant">{f}</span>
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlanClick(plan);
                      }}
                      className={`mt-auto text-sm font-medium py-2 rounded-xl border transition-all ${
                        plan.price > currentPlan.price
                          ? "bg-primary text-on-primary border-transparent hover:bg-primary/90 shadow-sm shadow-primary/20"
                          : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      {plan.price > currentPlan.price ? "Upgrade" : "Downgrade"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Payment Method ── */}
        <div className="glass-card p-6 flex flex-col gap-5 !rounded-2xl hover:!translate-y-0">
          <h3 className="text-base font-medium text-on-surface">
            Payment Method
          </h3>
          <div className="flex items-center justify-between rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3.5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-surface-container-lowest border border-outline-variant/40 rounded-lg flex items-center justify-center shrink-0">
                <span
                  className="material-symbols-outlined text-on-surface-variant text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  credit_card
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-on-surface">
                  {card.brand} ending in {card.last4}
                </p>
                <p className="text-xs text-on-surface-variant">
                  Expires {card.expires}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCheckout({ mode: "update-card", plan: null })}
              className="text-sm font-medium text-primary hover:underline underline-offset-2 transition-all"
            >
              Update
            </button>
          </div>
        </div>

        {/* ── Billing History ── */}
        <div className="glass-card p-6 flex flex-col gap-4 !rounded-2xl hover:!translate-y-0">
          <h3 className="text-base font-medium text-on-surface">
            Billing History
          </h3>
          <div className="rounded-xl border border-outline-variant/40 overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 px-4 py-2.5 bg-surface-container-low border-b border-outline-variant/30 text-[11px] font-medium text-on-surface-variant uppercase tracking-[0.06em]">
              <div className="col-span-5">Date</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-3 text-right">Amount</div>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {[
                { date: "Jul 1, 2026", desc: "Growth Plan — Monthly", amount: "$19.00" },
                { date: "Jun 1, 2026", desc: "Growth Plan — Monthly", amount: "$19.00" },
                { date: "May 1, 2026", desc: "Growth Plan — Monthly", amount: "$19.00" },
              ].map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 px-4 py-3.5 text-sm items-center hover:bg-surface-container-low transition-colors"
                >
                  <div className="col-span-5 text-on-surface-variant">{row.date}</div>
                  <div className="col-span-4 text-on-surface">{row.desc}</div>
                  <div className="col-span-3 text-right text-on-surface font-medium">{row.amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Cancel Subscription ── */}
        <div className="rounded-2xl border border-error/25 bg-error-container/20 p-6 flex flex-col sm:flex-row sm:items-center gap-4 text-left">
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <h3 className="text-base font-medium text-error flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">cancel</span>
              Cancel Subscription
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Canceling will downgrade your account to the Free tier at the end
              of your current billing cycle. You will lose access to all premium
              features.
            </p>
          </div>
          <button
            onClick={() => setCancelConfirm(true)}
            className="shrink-0 self-start sm:self-center text-sm font-medium text-error border border-error/50 px-4 py-2 rounded-xl hover:bg-error-container/60 transition-all whitespace-nowrap"
          >
            Cancel Subscription
          </button>
        </div>

        {/* Downgrade confirmation dialog */}
        {downgradeTarget && (
          <Modal onClose={() => setDowngradeTarget(null)} size="md">
              <div className="flex items-start gap-4 p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary-container text-primary">
                  <span className="material-symbols-outlined text-[22px]">south</span>
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-on-surface leading-snug">
                    Downgrade to {downgradeTarget.name}?
                  </h2>
                  <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                    Your plan drops from{" "}
                    <span className="font-medium text-on-surface">{currentPlan.name}</span> to{" "}
                    <span className="font-medium text-on-surface">{downgradeTarget.name}</span>{" "}
                    ({downgradeTarget.messages}) at the end of this billing cycle. Features
                    outside the new plan will be disabled.
                  </p>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-6 py-4 bg-surface-container-low/50 border-t border-outline-variant/40">
                <button
                  onClick={() => setDowngradeTarget(null)}
                  className="w-full sm:w-auto text-sm font-medium text-on-surface-variant px-4 py-2 rounded-xl border border-outline-variant/60 hover:bg-surface-container transition-all"
                >
                  Keep current plan
                </button>
                <button
                  onClick={() => {
                    setCurrentPlanName(downgradeTarget.name);
                    setDowngradeTarget(null);
                  }}
                  className="w-full sm:w-auto text-sm font-medium text-on-primary bg-primary px-4 py-2 rounded-xl hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/25"
                >
                  Yes, downgrade
                </button>
              </div>
          </Modal>
        )}

        {/* Confirmation dialog */}
        {cancelConfirm && (
          <Modal onClose={() => setCancelConfirm(false)} size="md">
              <div className="flex items-start gap-4 p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-error-container text-error">
                  <span className="material-symbols-outlined text-[22px]">warning</span>
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-on-surface leading-snug">
                    Cancel your subscription?
                  </h2>
                  <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                    Your <span className="font-medium text-on-surface">{currentPlan.name}</span>{" "}
                    plan stays active until the end of this billing cycle, then your account
                    drops to Free. This can&apos;t be undone from here.
                  </p>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-6 py-4 bg-surface-container-low/50 border-t border-outline-variant/40">
                <button
                  onClick={() => setCancelConfirm(false)}
                  className="w-full sm:w-auto text-sm font-medium text-on-surface-variant px-4 py-2 rounded-xl border border-outline-variant/60 hover:bg-surface-container transition-all"
                >
                  Keep plan
                </button>
                <button
                  onClick={() => {
                    setCurrentPlanName("Free");
                    setCancelConfirm(false);
                  }}
                  className="w-full sm:w-auto text-sm font-medium text-on-error bg-error px-4 py-2 rounded-xl hover:bg-error/90 active:scale-95 transition-all shadow-sm shadow-error/25"
                >
                  Yes, cancel
                </button>
              </div>
          </Modal>
        )}

        <div className="pb-xl" />
      </div>
    </div>
  );
}
