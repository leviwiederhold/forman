// src/components/quote-status-toast-listener.tsx
"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";

type Props = {
  userId: string;
};

type QuoteRow = {
  id: string;
  user_id: string;
  customer_name: string | null;
  status: string | null;
};

export default function QuoteStatusToastListener({ userId }: Props) {
  React.useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel(`quotes-status-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quotes",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as QuoteRow;
          const prev = payload.old as QuoteRow;

          const nextStatus = String(next.status ?? "");
          const prevStatus = String(prev.status ?? "");

          // only notify when status actually changes to accepted/rejected
          if (nextStatus !== prevStatus && (nextStatus === "accepted" || nextStatus === "rejected")) {
            const who = next.customer_name?.trim() || "Customer";
            toast(
              nextStatus === "accepted"
                ? `✅ ${who} accepted your quote`
                : `❌ ${who} rejected your quote`
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
