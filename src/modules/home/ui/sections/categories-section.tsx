"use client";

import { FilterCarousel } from "@/components/FilterCarousel";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface CategoriesSectionProps {
  categoryId?: string;
}

export const CategoriesSection = ({ categoryId }: CategoriesSectionProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return <FilterCarouselSkeleton />;

  return (
    <Suspense fallback={<FilterCarouselSkeleton />}>
      <ErrorBoundary fallback={<p>Error...</p>}>
        <CategoriesSectionSuspense categoryId={categoryId} />
      </ErrorBoundary>
    </Suspense>
  );
};

// Komponen skeleton khusus untuk loading state
const FilterCarouselSkeleton = () => (
  <div className="relative w-full">
    <div className="w-full px-12">
      <div className="-ml-3 flex">
        {Array.from({ length: 15 }).map((_, index) => (
          <div key={index} className="pl-3 basis-auto">
            <Skeleton className="rounded-lg px-3 py-1 h-7 w-[100px]" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const CategoriesSectionSuspense = ({ categoryId }: CategoriesSectionProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: categories } = useSuspenseQuery(
    trpc.categories.getMany.queryOptions()
  );
  const categoriesData = categories.map(({ name, id }) => ({
    value: id,
    label: name,
  }));

  const onSelect = (value: string | null) => {
    const url = new URL(window.location.href);

    if (value) {
      url.searchParams.set("categoryId", value);
    } else {
      url.searchParams.delete("categoryId");
    }

    router.push(url.toString());
  };

  return (
    <>
      <FilterCarousel
        value={categoryId}
        data={categoriesData}
        onSelect={onSelect}
      />
    </>
  );
};
