import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function AnnouncementBar() {
  return <div className="announcement-bar"><span>New episode resources are live.</span><Link href="/episodes" transitionTypes={["nav-forward"]}>Explore episodes <ArrowRight size={13} /></Link></div>;
}
