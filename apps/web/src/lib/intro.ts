// Tidak ada layar intro lagi, jadi entrance langsung boleh diputar.
export function useIntroDone(): boolean {
  return true;
}

export const ENTRANCE = { header: 0, announce: 0.2, content: 0.35 } as const;

let headerEntered = false;

export function consumeHeaderEntrance(): boolean {
  if (headerEntered) return false;
  headerEntered = true;
  return true;
}
