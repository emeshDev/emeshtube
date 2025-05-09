import { SidebarTrigger } from "@/components/ui/sidebar";
import Image from "next/image";
import Link from "next/link";
import React, { Suspense } from "react";
import { SearchInput } from "../SearchInput";
import { AuthButton } from "@/modules/auth/ui/components/AuthButton";

// Create a fallback component for SearchInput
const SearchInputFallback = () => (
  <div className="flex-1 flex justify-center max-w-[720px] mx-auto">
    <div className="flex w-full max-w-[600px]">
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Search"
          disabled
          className="w-full pl-4 py-2 pr-12 rounded-l-full border focus:outline-none"
        />
      </div>
      <button
        type="button"
        disabled
        className="px-5 py-2 bg-gray-100 border border-l-0 rounded-r-full opacity-50 cursor-not-allowed"
      >
        <span className="size-5 block"></span>
      </button>
    </div>
  </div>
);

const HomeNavbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white flex items-center px-2 pr-5 z-50">
      <div className="flex items-center gap-4 w-full">
        {/* Menu and Logo */}
        <div className="flex items-center shrink-0">
          <SidebarTrigger />
          <Link href={"/"}>
            <div className="p-4 flex items-center gap-1">
              <Image src={"/logo.svg"} width={32} height={532} alt="logo" />
              <p className="text-xl font-semibold tracking-tight">EmeshTube</p>
            </div>
          </Link>
        </div>
        {/* Search Bar wrapped in Suspense */}
        <Suspense fallback={<SearchInputFallback />}>
          <div className="flex-1 flex justify-center max-w-[720px] mx-auto">
            <SearchInput />
          </div>
        </Suspense>

        <div className="flex shrink-0 items-center gap-4">
          <AuthButton />
        </div>
      </div>
    </nav>
  );
};

export default HomeNavbar;
