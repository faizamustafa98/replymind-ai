import { create } from "zustand";
import { fetchTenant, updateTenant, type TenantChannels } from "@/src/lib/api/tenant";
import { fetchBusinessInfo, updateBusinessInfo } from "@/src/lib/api/documents";

interface BusinessProfile {
  operatingHours: string;
  location: string;
  deliveryOptions: string;
}

interface TenantState {
  id: string;
  businessName: string;
  businessType: string;
  botPersona: string;
  botLanguage: string;
  planTier: "free" | "pro" | "enterprise";
  createdAt: string;
  channels: TenantChannels;
  businessProfile: BusinessProfile;

  loaded: boolean;
  loading: boolean;
  error: string;

  fetchAll: () => Promise<void>;
  setBusinessName: (name: string) => void;
  setBusinessType: (type: string) => void;
  setBotPersona: (persona: string) => void;
  setBusinessProfile: (profile: Partial<BusinessProfile>) => void;
  setChannels: (channels: TenantChannels) => void;
  saveBizDetails: (name: string, type: string) => Promise<void>;
  saveCoreInfo: (patch: {
    operating_hours?: string;
    location?: string;
    delivery_options?: string;
  }) => Promise<void>;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  id: "",
  businessName: "",
  businessType: "",
  botPersona: "professional",
  botLanguage: "en",
  planTier: "free",
  createdAt: "",
  channels: {},
  businessProfile: {
    operatingHours: "",
    location: "",
    deliveryOptions: "",
  },

  loaded: false,
  loading: false,
  error: "",

  fetchAll: async () => {
    if (get().loading) return;
    set({ loading: true, error: "" });
    try {
      const [tenant, bizInfo] = await Promise.all([
        fetchTenant(),
        fetchBusinessInfo().catch(() => null),
      ]);
      set({
        id: tenant.id,
        businessName: tenant.business_name ?? "",
        businessType: tenant.business_type ?? "",
        botPersona: tenant.bot_persona ?? "professional",
        botLanguage: tenant.bot_language ?? "en",
        planTier: tenant.plan_tier ?? "free",
        createdAt: tenant.created_at ?? "",
        channels: tenant.channels ?? {},
        businessProfile: {
          operatingHours: bizInfo?.operating_hours ?? "",
          location: bizInfo?.location ?? "",
          deliveryOptions: bizInfo?.delivery_options ?? "",
        },
        loaded: true,
      });
    } catch (err: any) {
      set({ error: err.message ?? "Failed to load profile data." });
    } finally {
      set({ loading: false });
    }
  },

  setBusinessName: (businessName) => set({ businessName }),
  setBusinessType: (businessType) => set({ businessType }),
  setBotPersona: (botPersona) => set({ botPersona }),
  setBusinessProfile: (profile) =>
    set((state) => ({ businessProfile: { ...state.businessProfile, ...profile } })),
  setChannels: (channels) => set({ channels }),

  saveBizDetails: async (name, type) => {
    const updated = await updateTenant({ business_name: name, business_type: type });
    set({
      businessName: updated.business_name,
      businessType: updated.business_type,
    });
  },

  saveCoreInfo: async (patch) => {
    const updated = await updateBusinessInfo(patch);
    set({
      businessProfile: {
        operatingHours: updated.operating_hours ?? "",
        location: updated.location ?? "",
        deliveryOptions: updated.delivery_options ?? "",
      },
    });
  },
}));
