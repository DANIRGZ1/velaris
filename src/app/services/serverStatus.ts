import { getStoredIdentity } from "./dataService";

export interface ServerStatus {
  maintenance: boolean;
  message: string | null;
}

export async function fetchServerStatus(): Promise<ServerStatus> {
  try {
    const identity = getStoredIdentity();
    const region = identity?.region ?? "EUW";
    const { displayRegionToPlatform } = await import("./riotApi");
    const platform = displayRegionToPlatform(region);

    const r = await fetch(
      `https://${platform}.lol.status.riotgames.com/platform-data`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!r.ok) return { maintenance: false, message: null };
    const data = await r.json();

    const hasMaintenance =
      Array.isArray(data.maintenances) &&
      data.maintenances.some((m: any) => m.maintenance_status !== "complete");

    const msg = hasMaintenance
      ? (data.maintenances[0]?.titles?.[0]?.content ?? "Mantenimiento en progreso")
      : null;

    return { maintenance: hasMaintenance, message: msg };
  } catch {
    return { maintenance: false, message: null };
  }
}
