const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

interface Campus {
  name: string;
  domain: string;
  aliases: string[];
}

const CAMPUSES: Campus[] = [
  // Indonesia
  { name: "Institut Teknologi Del (IT Del)", domain: "del.ac.id", aliases: ["itdel", "institutteknologidel", "del"] },
  { name: "Institut Teknologi Bandung (ITB)", domain: "itb.ac.id", aliases: ["itb", "institutteknologibandung"] },
  { name: "Universitas Indonesia (UI)", domain: "ui.ac.id", aliases: ["ui", "universitasindonesia"] },
  { name: "Universitas Gadjah Mada (UGM)", domain: "ugm.ac.id", aliases: ["ugm", "universitasgadjahmada"] },
  { name: "Institut Teknologi Sepuluh Nopember (ITS)", domain: "its.ac.id", aliases: ["its", "institutteknologisepuluhnopember"] },
  { name: "IPB University", domain: "ipb.ac.id", aliases: ["ipb", "institutpertanianbogor"] },
  { name: "Universitas Padjadjaran (Unpad)", domain: "unpad.ac.id", aliases: ["unpad", "universitaspadjadjaran"] },
  { name: "Universitas Diponegoro (Undip)", domain: "undip.ac.id", aliases: ["undip", "universitasdiponegoro"] },
  { name: "Universitas Brawijaya (UB)", domain: "ub.ac.id", aliases: ["ub", "universitasbrawijaya", "brawijaya"] },
  { name: "Universitas Airlangga (Unair)", domain: "unair.ac.id", aliases: ["unair", "universitasairlangga"] },
  { name: "Universitas Negeri Yogyakarta (UNY)", domain: "uny.ac.id", aliases: ["uny", "universitasnegeriyogyakarta"] },
  { name: "Universitas Pendidikan Indonesia (UPI)", domain: "upi.edu", aliases: ["upi", "universitaspendidikanindonesia"] },
  { name: "Telkom University", domain: "telkomuniversity.ac.id", aliases: ["telkom", "telkomuniversity", "telkomuniv"] },
  { name: "Bina Nusantara (BINUS)", domain: "binus.ac.id", aliases: ["binus", "binanusantara", "binusuniversity"] },
  { name: "Universitas Sumatera Utara (USU)", domain: "usu.ac.id", aliases: ["usu", "universitassumaterautara"] },
  { name: "Universitas Andalas (Unand)", domain: "unand.ac.id", aliases: ["unand", "universitasandalas"] },
  { name: "Universitas Riau (Unri)", domain: "unri.ac.id", aliases: ["unri", "universitasriau"] },
  { name: "Universitas Hasanuddin (Unhas)", domain: "unhas.ac.id", aliases: ["unhas", "universitashasanuddin"] },
  { name: "Universitas Sebelas Maret (UNS)", domain: "uns.ac.id", aliases: ["uns", "universitassebelasmaret"] },
  { name: "Universitas Negeri Semarang (UNNES)", domain: "unnes.ac.id", aliases: ["unnes", "universitasnegerisemarang"] },
  { name: "Universitas Syiah Kuala (USK)", domain: "usk.ac.id", aliases: ["usk", "unsyiah", "universitassyiahkuala"] },
  { name: "Universitas Lampung (Unila)", domain: "unila.ac.id", aliases: ["unila", "universitaslampung"] },
  { name: "Universitas Sriwijaya (Unsri)", domain: "unsri.ac.id", aliases: ["unsri", "universitassriwijaya"] },
  { name: "Universitas Udayana (Unud)", domain: "unud.ac.id", aliases: ["unud", "universitasudayana"] },
  { name: "President University", domain: "president.ac.id", aliases: ["presidentuniversity"] },
  { name: "Universitas Pelita Harapan (UPH)", domain: "uph.edu", aliases: ["uph", "universitaspelitaharapan"] },
  { name: "Universitas Kristen Satya Wacana (UKSW)", domain: "uksw.edu", aliases: ["uksw", "satya wacana"] },
  { name: "Universitas Islam Indonesia (UII)", domain: "uii.ac.id", aliases: ["uii", "universitasislamindonesia"] },
  { name: "Universitas Muhammadiyah Yogyakarta (UMY)", domain: "umy.ac.id", aliases: ["umy", "muhammadiyah yogyakarta"] },
  // Luar negeri
  { name: "Massachusetts Institute of Technology (MIT)", domain: "mit.edu", aliases: ["mit", "massachusettsinstituteoftechnology"] },
  { name: "Stanford University", domain: "stanford.edu", aliases: ["stanford"] },
  { name: "Harvard University", domain: "harvard.edu", aliases: ["harvard"] },
  { name: "University of Oxford", domain: "ox.ac.uk", aliases: ["oxford"] },
  { name: "University of Cambridge", domain: "cam.ac.uk", aliases: ["cambridge"] },
  { name: "National University of Singapore (NUS)", domain: "nus.edu.sg", aliases: ["nus", "nationaluniversityofsingapore"] },
  { name: "Nanyang Technological University (NTU)", domain: "ntu.edu.sg", aliases: ["ntu", "nanyang"] },
  { name: "University of Tokyo", domain: "u-tokyo.ac.jp", aliases: ["utokyo", "universityoftokyo"] },
  { name: "ETH Zurich", domain: "ethz.ch", aliases: ["eth", "ethzurich"] },
  { name: "Technical University of Munich (TUM)", domain: "tum.de", aliases: ["tum", "technicaluniversityofmunich"] },
  { name: "Delft University of Technology", domain: "tudelft.nl", aliases: ["tudelft", "delft"] },
  { name: "University of Melbourne", domain: "unimelb.edu.au", aliases: ["unimelb", "melbourne"] },
  { name: "University of Sydney", domain: "sydney.edu.au", aliases: ["sydney"] },
  { name: "University of New South Wales (UNSW)", domain: "unsw.edu.au", aliases: ["unsw"] },
  { name: "Monash University", domain: "monash.edu", aliases: ["monash"] },
  { name: "University of Toronto", domain: "utoronto.ca", aliases: ["utoronto", "toronto"] },
  { name: "University of British Columbia (UBC)", domain: "ubc.ca", aliases: ["ubc"] },
  { name: "New York University (NYU)", domain: "nyu.edu", aliases: ["nyu"] },
  { name: "University of California, Berkeley", domain: "berkeley.edu", aliases: ["berkeley", "ucberkeley"] },
  { name: "California Institute of Technology (Caltech)", domain: "caltech.edu", aliases: ["caltech"] },
  { name: "Imperial College London", domain: "imperial.ac.uk", aliases: ["imperial", "imperialcollege"] },
  { name: "University College London (UCL)", domain: "ucl.ac.uk", aliases: ["ucl"] },
  { name: "University of Edinburgh", domain: "ed.ac.uk", aliases: ["edinburgh"] },
  { name: "KAIST", domain: "kaist.ac.kr", aliases: ["kaist"] },
  { name: "National Taiwan University (NTU Taiwan)", domain: "ntu.edu.tw", aliases: ["ntutaiwan", "nationaltaiwanuniversity"] },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Names shown in the campus dropdown. */
export const CAMPUS_NAMES: string[] = CAMPUSES.map((campus) => campus.name);

/** Resolve a campus name (e.g. "IT Del") to a logo URL. */
export function campusLogo(name: string | null | undefined): string | null {
  const normalized = normalize(name ?? "");
  if (!normalized) return null;

  const match =
    CAMPUSES.find((campus) => normalize(campus.name) === normalized) ??
    CAMPUSES.find((campus) => campus.aliases.includes(normalized)) ??
    CAMPUSES.find((campus) => normalized.includes(normalize(campus.name))) ??
    CAMPUSES.find((campus) => campus.aliases.some((alias) => alias.length > 3 && normalized.includes(alias)));

  return match ? favicon(match.domain) : null;
}

/** Reverse lookup: find the campus name that produced a given logo URL. */
export function campusNameFromLogo(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = CAMPUSES.find((campus) => favicon(campus.domain) === url);
  return match ? match.name : null;
}

/** Build a favicon URL for any domain, e.g. "del.ac.id". */
export function logoFromDomain(domain: string | null | undefined): string | null {
  const value = (domain ?? "").trim().toLowerCase();
  if (!value || !value.includes(".") || /\s/.test(value)) return null;
  return favicon(value);
}

/** Extract the domain from a stored favicon URL. */
export function domainFromLogo(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/[?&]domain=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** The text to show in the picker for a stored logo URL. */
export function campusSourceText(url: string | null | undefined): string {
  return campusNameFromLogo(url) ?? domainFromLogo(url) ?? "";
}
