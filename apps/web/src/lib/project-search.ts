import type { Project } from "@portofolio/shared";

export function matchesProject(project: Project, query: string): boolean {
  const haystack = [project.title, project.category ?? "", ...project.tech_stacks]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
