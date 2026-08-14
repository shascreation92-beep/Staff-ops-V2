"use client";

import React, { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnnouncementProvider } from "./AnnouncementProvider";
import { ITConfigProvider } from "./ITConfigProvider";

import { Toaster } from "react-hot-toast";
import PushRegister from "./PushRegister";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds fresh window
        gcTime: 5 * 60 * 1000, // 5 minutes garbage collection time
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <AnnouncementProvider>
          <ITConfigProvider>
            {children}
            <Toaster position="top-right" reverseOrder={false} />
            <PushRegister />
          </ITConfigProvider>
        </AnnouncementProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
