import { redirect } from "next/navigation";
export default async function LegacyArticlePage({ params }: { params: Promise<{ slug: string }> }) { redirect(`/episodes/${(await params).slug}`); }
