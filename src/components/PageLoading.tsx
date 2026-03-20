import { LoaderCircle } from "lucide-react";

interface PageLoadingProps {
  title?: string;
  subtitle?: string;
}

export function PageLoading({
  title = "",
  subtitle = "Chargement en cours…",
}: PageLoadingProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-slate-300" />
        <p className="text-sm text-slate-300">{subtitle}</p>
        {title ? <p className="text-xs text-slate-500">{title}</p> : null}
      </div>
    </div>
  );
}
