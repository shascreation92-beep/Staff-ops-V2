"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface ITConfigContextType {
  verificationCost: number;
  updateVerificationCost: (cost: number) => Promise<boolean>;
  loading: boolean;
}

const ITConfigContext = createContext<ITConfigContextType | undefined>(undefined);

export function ITConfigProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [verificationCost, setVerificationCost] = useState<number>(300);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCost = async () => {
    try {
      const res = await fetch("/api/it-config");
      if (res.ok) {
        const data = await res.json();
        if (typeof data.cost === "number") {
          setVerificationCost(data.cost);
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

  const updateVerificationCost = async (newCost: number): Promise<boolean> => {
    try {
      const res = await fetch("/api/it-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cost: newCost })
      });
      if (res.ok) {
        setVerificationCost(newCost);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to update IT config", err);
      return false;
    }
  };

  return (
    <ITConfigContext.Provider value={{ verificationCost, updateVerificationCost, loading }}>
      {children}
    </ITConfigContext.Provider>
  );
}

export function useITConfig() {
  const context = useContext(ITConfigContext);
  if (!context) {
    throw new Error("useITConfig must be used within an ITConfigProvider");
  }
  return context;
}
