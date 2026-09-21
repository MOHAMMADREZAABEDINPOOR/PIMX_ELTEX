import type { Metadata } from "next";
import { CodeLibrary } from "@/components/code-library";
import { getPublishedProjects } from "@/lib/public-content";

export const metadata: Metadata = { title: "Projects", description: "Preview and download finished website projects from PIMX_ELTEX.", alternates: { canonical: "/code" } };
export const dynamic = "force-static";

export default async function CodePage() {
  const projects = await getPublishedProjects();
  return <div className="simple-page page-shell">
    <header className="simple-page-header"><span className="simple-kicker">PROJECTS</span><h1>Explore the projects.</h1><p>Preview finished websites and download their source files.</p></header>
    {projects.length ? <CodeLibrary projects={projects} /> : <p className="simple-empty">No projects published yet.</p>}
  </div>;
}
