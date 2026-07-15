"use client";

import React, { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnnouncementProvider } from "./AnnouncementProvider";
import { ITConfigProvider } from "./ITConfigProvider";

import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
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
          </ITConfigProvider>
        </AnnouncementProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
