
interface SkeletonLoaderProps {
  className?: string;
  count?: number;
  variant?: "text" | "circular" | "rectangular" | "card" | "avatar";
}

export function SkeletonLoader({ 
  className = "", 
  count = 1,
  variant = "text" 
}: SkeletonLoaderProps) {
  const baseClass = "animate-pulse bg-gray-200 dark:bg-gray-700";
  
  const variants = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded",
    card: "rounded-xl h-48",
    avatar: "rounded-full w-12 h-12",
  };

  const skeletonElements = Array.from({ length: count }).map((_, index) => (
    <div
      key={index}
      className={`${baseClass} ${variants[variant]} ${className}`}
      style={{
        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      }}
    />
  ));

  return <>{skeletonElements}</>;
}

// Composants de skeleton spécialisés
export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4">
      <SkeletonLoader variant="circular" className="w-16 h-16" />
      <SkeletonLoader variant="text" className="w-3/4" />
      <SkeletonLoader variant="text" className="w-1/2" />
      <SkeletonLoader variant="rectangular" className="h-32 w-full" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex gap-4">
          <SkeletonLoader variant="text" className="w-1/4" />
          <SkeletonLoader variant="text" className="w-1/4" />
          <SkeletonLoader variant="text" className="w-1/4" />
          <SkeletonLoader variant="text" className="w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <SkeletonLoader variant="avatar" />
          <div className="flex-1 space-y-2">
            <SkeletonLoader variant="text" className="w-3/4" />
            <SkeletonLoader variant="text" className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <SkeletonLoader variant="card" className="flex-1" />
        <SkeletonLoader variant="card" className="flex-1" />
        <SkeletonLoader variant="card" className="flex-1" />
      </div>
      <SkeletonTable />
    </div>
  );
}

