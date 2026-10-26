const DEVICON_BASE = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/";

const TECH_MAP: Record<string, string> = {
  react: "react/react-original",
  reactjs: "react/react-original",
  next: "nextjs/nextjs-original",
  nextjs: "nextjs/nextjs-original",
  laravel: "laravel/laravel-original",
  postgres: "postgresql/postgresql-original",
  postgresql: "postgresql/postgresql-original",
  docker: "docker/docker-original",
  typescript: "typescript/typescript-original",
  tailwind: "tailwindcss/tailwindcss-original",
  tailwindcss: "tailwindcss/tailwindcss-original",
  git: "git/git-original",
  github: "github/github-original",
  html: "html5/html5-original",
  html5: "html5/html5-original",
  css: "css3/css3-original",
  css3: "css3/css3-original",
  javascript: "javascript/javascript-original",
  js: "javascript/javascript-original",
  figma: "figma/figma-original",
  node: "nodejs/nodejs-original",
  nodejs: "nodejs/nodejs-original",
  python: "python/python-original",
  php: "php/php-original",
  vue: "vuejs/vuejs-original",
  vuejs: "vuejs/vuejs-original",
  nuxt: "nuxtjs/nuxtjs-original",
  nuxtjs: "nuxtjs/nuxtjs-original",
  angular: "angular/angular-original",
  svelte: "svelte/svelte-original",
  express: "express/express-original",
  django: "django/django-plain",
  flask: "flask/flask-original",
  java: "java/java-original",
  kotlin: "kotlin/kotlin-original",
  swift: "swift/swift-original",
  go: "go/go-original-wordmark",
  golang: "go/go-original-wordmark",
  rust: "rust/rust-original",
  ruby: "ruby/ruby-original",
  rails: "rails/rails-original-wordmark",
  sqlite: "sqlite/sqlite-original",
  firebase: "firebase/firebase-original",
  kubernetes: "kubernetes/kubernetes-original",
  terraform: "terraform/terraform-original",
  graphql: "graphql/graphql-plain",
  flutter: "flutter/flutter-original",
  dart: "dart/dart-original",
  cplusplus: "cplusplus/cplusplus-original",
  csharp: "csharp/csharp-original",
  wordpress: "wordpress/wordpress-original",
  aws: "amazonwebservices/amazonwebservices-original-wordmark",
  azure: "azure/azure-original",
  googlecloud: "googlecloud/googlecloud-original",
  mysql: "mysql/mysql-original",
  mongodb: "mongodb/mongodb-original",
  redis: "redis/redis-original",
  nginx: "nginx/nginx-original",
  linux: "linux/linux-original",
  vite: "vitejs/vitejs-original",
  sass: "sass/sass-original",
  bootstrap: "bootstrap/bootstrap-original",
  npm: "npm/npm-original-wordmark",
  yarn: "yarn/yarn-original",
  composer: "composer/composer-original",
};

export function resolveTechLogo(name: string | null | undefined): string | null {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return null;
  const key = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!key) return null;
  const iconPath = TECH_MAP[key] ?? `${key}/${key}-original`;
  return `${DEVICON_BASE}${iconPath}.svg`;
}

const SOCIAL_LOGOS: Record<string, string> = {
  LinkedIn: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/linkedin-icon.svg",
  GitHub: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/github-icon.svg",
  Instagram: "https://cdn.jsdelivr.net/gh/gauravghongde/social-icons/SVG/Color/Instagram.svg",
  X: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/twitter.svg",
  Facebook: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/facebook.svg",
  YouTube: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/youtube-icon.svg",
  TikTok: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/tiktok-icon.svg",
  WhatsApp: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/whatsapp-icon.svg",
  Telegram: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/telegram.svg",
  Discord: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/discord-icon.svg",
  Medium: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/medium-icon.svg",
  Dribbble: "https://cdn.jsdelivr.net/gh/gauravghongde/social-icons/SVG/Color/Dribbble.svg",
  Behance: "https://cdn.jsdelivr.net/gh/gauravghongde/social-icons/SVG/Color/Behance.svg",
  GitLab: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/gitlab-icon.svg",
  Pinterest: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/pinterest.svg",
  Reddit: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/reddit-icon.svg",
  "Stack Overflow": "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/stackoverflow-icon.svg",
};

export const SOCIAL_PLATFORMS = [...Object.keys(SOCIAL_LOGOS), "Email"];

export function isEmailPlatform(platform: string | null | undefined): boolean {
  return (platform ?? "").toLowerCase() === "email";
}

const SOCIAL_NAMES: Record<string, string> = {
  "github.com": "GitHub",
  "linkedin.com": "LinkedIn",
  "instagram.com": "Instagram",
  "x.com": "X",
  "twitter.com": "X",
  "facebook.com": "Facebook",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "tiktok.com": "TikTok",
  "whatsapp.com": "WhatsApp",
  "wa.me": "WhatsApp",
  "telegram.org": "Telegram",
  "t.me": "Telegram",
  "discord.com": "Discord",
  "medium.com": "Medium",
  "dribbble.com": "Dribbble",
  "behance.net": "Behance",
  "gitlab.com": "GitLab",
  "pinterest.com": "Pinterest",
  "reddit.com": "Reddit",
  "stackoverflow.com": "Stack Overflow",
  "figma.com": "Figma",
  "threads.net": "Threads",
  "twitch.tv": "Twitch",
};

export function resolveSocialName(url: string | null | undefined): string {
  const value = (url ?? "").trim();
  if (!value) return "";

  if (!value.includes("://") && value.includes("@")) return "Email";

  let host: string | null = null;
  try {
    host = new URL(value.startsWith("http") ? value : `https://${value}`).hostname.replace(
      /^www\./,
      "",
    );
  } catch {
    host = null;
  }
  if (!host) return value;

  const parts = host.split(".");
  const root = parts.length >= 2 ? parts.slice(-2).join(".") : host;
  const known = SOCIAL_NAMES[host] ?? SOCIAL_NAMES[root];
  if (known) return known;

  const label = (parts[0] ?? host).replace(/[^a-z0-9]/gi, " ").trim();
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : host;
}

export function resolveLogoFromUrl(url: string | null | undefined): string | null {
  const value = (url ?? "").trim();
  if (!value) return null;

  let host: string | null = null;
  if (!value.includes("://") && value.includes("@")) {
    host = value.split("@").pop()?.trim() ?? null;
  } else {
    try {
      host = new URL(value.startsWith("http") ? value : `https://${value}`).hostname;
    } catch {
      host = null;
    }
  }

  if (!host) return null;
  return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
}

export function resolveSocialLogo(platform: string | null | undefined, value?: string | null): string | null {
  const key = (platform ?? "").trim();
  if (!key) return null;

  if (isEmailPlatform(key)) {
    if (value && value.includes("@")) {
      const domain = value.split("@").pop();
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }
    return "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/google-gmail.svg";
  }

  return SOCIAL_LOGOS[key] ?? null;
}
