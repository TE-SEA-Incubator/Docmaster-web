import { Suspense, type LazyExoticComponent, type ComponentType } from "react";

interface LazyPageProps {
  Component: LazyExoticComponent<ComponentType<any>>;
}

function Skeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-lg" />
      <div className="h-4 w-96 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function LazyPage({ Component }: LazyPageProps) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Component />
    </Suspense>
  );
}
