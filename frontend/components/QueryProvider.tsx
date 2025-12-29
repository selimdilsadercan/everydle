"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // QueryClient'ı state içinde tutuyoruz ki her renderda sıfırlanmasın
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Veri önbellekte 5 dakika taze kalır
            staleTime: 5 * 60 * 1000, 
            // Veri 10 dakika boyunca kullanılmazsa silinir
            gcTime: 10 * 60 * 1000,
            // Pencereye odaklanıldığında tekrar çekme (opsiyonel)
            refetchOnWindowFocus: false,
            // Hata durumunda 1 kez tekrar dene
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
