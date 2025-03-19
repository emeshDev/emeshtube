"use client";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export const StudioUploadButton = () => {
  return (
    <Button variant={"secondary"}>
      <PlusIcon />
      Create
    </Button>
  );
};
