const GIL = "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/";
const SI = "https://cdn.simpleicons.org/";
const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

/**
 * Map of brand keywords (normalized: lowercase, alphanumeric only) to a logo URL.
 * Specific brands are listed first so they win over more generic keywords.
 */
const CERT_MAP: Record<string, string> = {
  amazonwebservices: `${GIL}aws.svg`,
  googlecloud: `${GIL}google-cloud.svg`,
  microsoftazure: `${GIL}microsoft-azure.svg`,
  linuxfoundation: `${SI}linuxfoundation`,
  scrumalliance: `${SI}scrumalliance`,
  aws: `${GIL}aws.svg`,
  amazon: `${GIL}aws.svg`,
  google: `${GIL}google.svg`,
  gcp: `${GIL}google-cloud.svg`,
  azure: `${GIL}microsoft-azure.svg`,
  microsoft: `${GIL}microsoft.svg`,
  meta: `${GIL}meta.svg`,
  facebook: `${GIL}meta.svg`,
  coursera: `${GIL}coursera.svg`,
  udemy: `${GIL}udemy.svg`,
  udacity: `${GIL}udacity.svg`,
  dicoding: favicon("dicoding.com"),
  myskill: favicon("myskill.id"),
  cisco: `${SI}cisco`,
  oracle: `${GIL}oracle.svg`,
  ibm: `${GIL}ibm.svg`,
  comptia: `${SI}comptia`,
  redhat: `${GIL}redhat.svg`,
  linux: `${SI}linux`,
  ubuntu: `${GIL}ubuntu.svg`,
  mongodb: `${GIL}mongodb.svg`,
  docker: `${GIL}docker.svg`,
  kubernetes: `${GIL}kubernetes.svg`,
  cncf: `${SI}cncf`,
  freecodecamp: `${SI}freecodecamp`,
  hackerrank: `${SI}hackerrank`,
  codecademy: `${GIL}codecademy.svg`,
  pluralsight: `${SI}pluralsight`,
  linkedin: `${GIL}linkedin.svg`,
  salesforce: `${GIL}salesforce.svg`,
  sap: `${GIL}sap.svg`,
  vmware: `${GIL}vmware.svg`,
  hashicorp: `${GIL}hashicorp.svg`,
  databricks: `${GIL}databricks.svg`,
  snowflake: `${GIL}snowflake.svg`,
  tableau: `${GIL}tableau.svg`,
  tensorflow: `${GIL}tensorflow.svg`,
  postgresql: `${GIL}postgresql.svg`,
  android: `${GIL}android.svg`,
  apple: `${GIL}apple.svg`,
  adobe: `${GIL}adobe.svg`,
  unity: `${GIL}unity.svg`,
  figma: `${GIL}figma.svg`,
};

/** Resolve a certificate title (e.g. "AWS Certified…") to a brand logo URL. */
export function resolveCertLogo(name: string | null | undefined): string | null {
  const source = (name ?? "").trim().toLowerCase();
  if (!source) return null;
  const normalized = source.replace(/[^a-z0-9]+/g, "");

  for (const [key, url] of Object.entries(CERT_MAP)) {
    if (normalized.includes(key)) return url;
  }

  return null;
}

/** Selectable issuing organizations for certifications. */
export const CERT_ORGANIZATIONS: string[] = [
  "Amazon Web Services",
  "Google Cloud",
  "Microsoft Azure",
  "Meta",
  "Coursera",
  "Udemy",
  "Udacity",
  "Dicoding",
  "MySkill",
  "Cisco",
  "Oracle",
  "IBM",
  "CompTIA",
  "Red Hat",
  "Linux Foundation",
  "MongoDB",
  "Docker",
  "Kubernetes",
  "CNCF",
  "freeCodeCamp",
  "HackerRank",
  "Codecademy",
  "Pluralsight",
  "LinkedIn",
  "Salesforce",
  "SAP",
  "VMware",
  "HashiCorp",
  "Databricks",
  "Snowflake",
  "Tableau",
  "TensorFlow",
  "PostgreSQL",
  "Android",
  "Apple",
  "Adobe",
  "Unity",
  "Figma",
  "Scrum Alliance",
];
