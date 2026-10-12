"use client";
import { useState } from "react";
import { createClient } from "@/src/lib/supabase/client";

const inputCls =
  "w-full rounded-xl border border-outline-variant/50 bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary px-3 py-3 transition-all";

export default function Step1BusinessProfile({ onNext }) {
  const [name, setName] = useState("");
  // The same three "Core Business Information" fields the Documents page shows.
  // Saved into the tenant's business_profile blob so they persist and surface
  // there (and on the Profile page) after onboarding.
  const [operatingHours, setOperatingHours] = useState("");
  const [location, setLocation] = useState("");
  const [deliveryOptions, setDeliveryOptions] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) {
      setError("Business name is required.");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError("You must be logged in to continue.");
        return;
      }

      const { error: userError } = await supabase.auth.getUser();
      if (userError) {
        setError("Your session expired. Please sign in again.");
        return;
      }

      // business_profile is shallow-merged server-side, so sending these keys
      // here is exactly what the Documents page's "Save Info" writes later —
      // both edit the same blob.
      const businessProfile = {
        operating_hours: operatingHours.trim(),
        location: location.trim(),
        delivery_options: deliveryOptions.trim(),
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ business_name: name, business_profile: businessProfile }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail?.[0]?.msg ?? body?.detail ?? "Something went wrong. Please try again.");
        return;
      }

      onNext({ business_name: name, business_profile: businessProfile });
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium text-on-surface mb-1">
          Set up your business profile
        </h1>
        <p className="text-sm text-on-surface-variant">
          Core business details the AI references instantly when replying to customers.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Business Name */}
        <div>
          <label className="block text-[11px] font-medium text-on-surface-variant uppercase tracking-[0.06em] mb-1.5">
            Business Name
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">
              storefront
            </span>
            <input
              type="text"
              className={`${inputCls} pl-10`}
              placeholder="e.g. Artisan Brews Co."
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
            />
          </div>
          {error && <p className="text-xs text-error mt-1.5">{error}</p>}
        </div>

        {/* Business Hours */}
        <div>
          <label className="block text-[11px] font-medium text-on-surface-variant uppercase tracking-[0.06em] mb-1.5">
            Business Hours
          </label>
          <textarea
            rows={2}
            className={`${inputCls} resize-none`}
            placeholder="e.g. Mon–Fri: 9 AM – 6 PM"
            value={operatingHours}
            onChange={(e) => setOperatingHours(e.target.value)}
          />
        </div>

        {/* Business Location */}
        <div>
          <label className="block text-[11px] font-medium text-on-surface-variant uppercase tracking-[0.06em] mb-1.5">
            Business Location
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">
              location_on
            </span>
            <input
              type="text"
              className={`${inputCls} pl-10`}
              placeholder="e.g. 123 Main Street, Lahore"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        {/* Delivery Options & Rates */}
        <div>
          <label className="block text-[11px] font-medium text-on-surface-variant uppercase tracking-[0.06em] mb-1.5">
            Delivery Options &amp; Rates
          </label>
          <textarea
            rows={2}
            className={`${inputCls} resize-none`}
            placeholder="e.g. Free delivery on orders over $50"
            value={deliveryOptions}
            onChange={(e) => setDeliveryOptions(e.target.value)}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-outline-variant/30">
        <button
          disabled
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-on-surface-variant opacity-30 cursor-not-allowed"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving..." : "Continue"}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
