import { useEffect, useRef, useState } from "react";
import AnimeRow from "./AnimeRow";
import { useAuthStore } from "@/stores/useAuthStore";
import { getContinueWatching } from "@/api/progress";
import { getForYou } from "@/api/animeApi";

// Gardée pour un affichage instantané au retour sur la Home.
let cachedRow = null;

/** Rien sans compte ni historique. */
export default function ForYouRow() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const authUserId = user?.id || session?.user?.id || null;
  const [row, setRow] = useState(cachedRow);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    (async () => {
      const recent = await getContinueWatching(8);
      const slugs = recent.map((r) => r.slug).filter(Boolean);
      if (!slugs.length) return;
      const data = await getForYou(slugs);
      if (id !== reqId.current) return;
      cachedRow = data;
      setRow(data);
    })();
  }, [authUserId]);

  if (!row?.items?.length) return null;
  return <AnimeRow title={row.title} items={row.items} />;
}
