"use client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Image from "next/image";
import Link from "next/link";
import React from "react";

import { AuthButton } from "@/modules/auth/ui/components/AuthButton";
import { StudioUploadButton } from "../StudioUploadButton";

const StudioNavbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white flex items-center px-2 pr-5 z-50 border-b shadow-md">
      <div className="flex items-center gap-4 w-full">
        {/* Menu and Logo */}
        <div className="flex items-center shrink-0">
          <SidebarTrigger />
          <Link href={"/studio"}>
            <div className="p-4 flex items-center gap-1">
              <Image src={"/logo.svg"} width={32} height={532} alt="logo" />
              <p className="text-xl font-semibold tracking-tight">Studio</p>
            </div>
          </Link>
        </div>

        <div className="flex-1" />

        <div className="flex shrink-0 items-center gap-4">
          <StudioUploadButton />
          <AuthButton />
        </div>
      </div>
    </nav>
  );
};

export default StudioNavbar;
