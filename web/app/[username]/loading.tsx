import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function UserLoading() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
