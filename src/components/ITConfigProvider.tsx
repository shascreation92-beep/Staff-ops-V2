"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface ITConfigContextType {
  verificationCost: number; // Legacy alias for facebookCost
  facebookCost: number;
  vintedCost: number;
  updateVerificationCost: (cost: number) => Promise<boolean>; // Legacy alias for updateFacebookCost
  updateFacebookCost: (cost: number) => Promise<boolean>;
  updateVintedCost: (cost: number) => Promise<boolean>;
  loading: boolean;
}

const ITConfigContext = createContext<ITConfigContextType | undefined>(undefined);

export function ITConfigProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [facebookCost, setFacebookCost] = useState<number>(300);
  const [vintedCost, setVintedCost] = useState<number>(300);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCost = async () => {
    try {
      const res = await fetch("/api/it-config");
      if (res.ok) {
        const data = await res.json();
        if (typeof data.facebookCost === "number") {
          setFacebookCost(data.facebookCost);
        }
        if (typeof data.vintedCost === "number") {
          setVintedCost(data.vintedCost);
        }
      }
    } catch (err) {
      console.error("Failed to fetch IT config", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    fetchCost();
  }, [session?.user?.id]);

  const updateFacebookCost = async (newCost: number): Promise<boolean> => {
    try {
      const res = await fetch("/api/it-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facebookCost: newCost })
      });
      if (res.ok) {
        setFacebookCost(newCost);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to update Facebook config", err);
      return false;
    }
  };

  const updateVintedCost = async (newCost: number): Promise<boolean> => {
    try {
      const res = await fetch("/api/it-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vintedCost: newCost })
      });
      if (res.ok) {
        setVintedCost(newCost);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to update Vinted config", err);
      return false;
    }
  };

  return (
    <ITConfigContext.Provider value={{ 
      verificationCost: facebookCost, 
      facebookCost, 
      vintedCost, 
      updateVerificationCost: updateFacebookCost, 
      updateFacebookCost, 
      updateVintedCost, 
      loading 
    }}>
      {children}
    </ITConfigContext.Provider>
  );
}

const defaultITConfigContext: ITConfigContextType = {
  verificationCost: 300,
  facebookCost: 300,
  vintedCost: 300,
  updateVerificationCost: async () => false,
  updateFacebookCost: async () => false,
  updateVintedCost: async () => false,
  loading: false,
};

export function useITConfig() {
  const context = useContext(ITConfigContext);
  return context || defaultITConfigContext;
}
