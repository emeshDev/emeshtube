/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const trpc = useTRPC();
  const [name, setName] = useState("world");

  const { data, isLoading, error } = useQuery(
    trpc.hello.queryOptions({ text: name })
  );
  return <div>Hello TRPC : {data?.greeting}</div>;
}
