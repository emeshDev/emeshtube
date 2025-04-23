"use client";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchIcon, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export const SearchInput = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(initialQuery.length > 0);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // clear search term
  const handleClear = () => {
    setSearchTerm("");
    setIsSearching(false);
    router.push("/");
  };

  // Handle form submission (when user presses Enter)
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (searchTerm.trim().length > 0) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  // Auto-search after 4 characters
  useEffect(() => {
    if (debouncedSearchTerm.length >= 4) {
      setIsSearching(true);
      router.push(`/search?q=${encodeURIComponent(debouncedSearchTerm)}`);
    } else if (debouncedSearchTerm.length === 0 && isSearching) {
      setIsSearching(false);
      router.push("/");
    }
  }, [debouncedSearchTerm, router, isSearching]);

  return (
    <form className="flex w-full max-w-[600px]" onSubmit={handleSubmit}>
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-4 py-2 pr-12 rounded-l-full border focus:outline-none focus:border-blue-400"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            <X className="size-5" />
          </button>
        )}
      </div>
      <button
        type="submit"
        className="px-5 py-2 bg-gray-100 border border-l-0 rounded-r-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={searchTerm.trim().length === 0}
      >
        <SearchIcon className="size-5" />
      </button>
    </form>
  );
};
