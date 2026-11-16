/**
 * Skeletons.jsx — Loaders de esqueleto reutilizables (estilo Netflix/Airbnb).
 * Usan las clases `.skeleton` y `.shimmer` ya definidas en index.css.
 */

const Box = ({ className = '' }) => <div className={`skeleton shimmer ${className}`} />;

/** Tarjeta individual de cancha/producto. */
function CardSkeleton() {
  return (
    <div className="card overflow-hidden flex flex-col">
      <Box className="h-48 w-full rounded-none" />
      <div className="p-5 space-y-3 flex-1">
        <Box className="h-5 w-3/4" />
        <Box className="h-3 w-full" />
        <Box className="h-3 w-2/3" />
        <div className="flex items-center justify-between pt-3">
          <Box className="h-6 w-16" />
          <Box className="h-9 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function CanchasSkeleton({ items = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: items }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export function ProductosSkeleton({ items = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: items }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export function PremiosSkeleton({ items = 4 }) {
  return (
    <div className="space-y-6">
      <Box className="h-40 w-full rounded-2xl" />
      <Box className="h-6 w-48" />
      <div className="grid gap-4">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="card p-5 flex items-center justify-between">
            <div className="space-y-2"><Box className="h-4 w-40" /><Box className="h-3 w-24" /></div>
            <Box className="h-7 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-6 flex items-center gap-4">
          <Box className="w-16 h-16 rounded-2xl" />
          <div className="space-y-2"><Box className="h-3 w-24" /><Box className="h-7 w-16" /></div>
        </div>
      ))}
    </div>
  );
}

export function PerfilSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="card p-8 flex flex-col sm:flex-row items-center gap-6">
        <Box className="w-28 h-28 rounded-full" />
        <div className="flex-1 space-y-3 w-full"><Box className="h-7 w-48" /><Box className="h-4 w-64" /><Box className="h-6 w-28 rounded-full" /></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3"><Box className="w-11 h-11 rounded-xl" /><Box className="h-7 w-12" /><Box className="h-3 w-20" /></div>
        ))}
      </div>
      <Box className="h-48 w-full rounded-2xl" />
    </div>
  );
}

export function PromocionesSkeleton({ items = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <Box className="h-36 w-full rounded-none" />
          <div className="p-4 space-y-3"><Box className="h-5 w-2/3" /><Box className="h-3 w-full" /><Box className="h-3 w-1/2" /></div>
        </div>
      ))}
    </div>
  );
}
