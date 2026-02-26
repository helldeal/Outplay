import { LibraryBig, LoaderCircle } from "lucide-react";
import { CardTile } from "../components/CardTile";
import { useAuth } from "../auth/AuthProvider";
import { useCollectionQuery } from "../query/collection";

export function CollectionPage() {
  const { user } = useAuth();
  const collectionQuery = useCollectionQuery(user?.id);

  if (!user) {
    return (
      <p className="text-sm text-slate-400">
        Connecte-toi pour afficher ta collection.
      </p>
    );
  }

  if (collectionQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Chargement de la collection...
      </p>
    );
  }

  if (collectionQuery.error) {
    return (
      <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
        {(collectionQuery.error as Error).message}
      </div>
    );
  }

  const cards = collectionQuery.data ?? [];

  return (
    <section className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <LibraryBig className="h-6 w-6 text-cyan-300" />
          Collection
        </h1>
        <p className="text-sm text-slate-400">
          Triée par rareté: Legends, World Class, Champion, Challenger, Rookie.
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-md border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
          Aucune carte possédée pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {cards.map((entry) => (
            <CardTile
              key={entry.card_id}
              card={entry.card}
              obtainedAt={entry.obtained_at}
            />
          ))}
        </div>
      )}
    </section>
  );
}
