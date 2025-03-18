/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function HelloComponent() {
  const trpc = useTRPC();
  const [name, setName] = useState("world");
  const [isClient, setIsClient] = useState(false);

  // Mencegah hydration mismatch dengan mendeteksi client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { data, isLoading, error } = useQuery(
    trpc.hello.queryOptions({ text: name })
  );

  // Hanya render konten utama setelah di client
  if (!isClient) {
    return <div className="p-4 border rounded">Loading...</div>;
  }

  return <div>Hello TRPC : {data?.greeting}</div>;
}
