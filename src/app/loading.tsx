import { ViewTransition } from "react";

export default function Loading() {
  return <ViewTransition exit="slide-down" default="none"><div className="loading-shell" role="status" aria-label="Loading page"><div className="loading-line short" /><div className="loading-line title" /><div className="loading-line" /><div className="loading-grid"><span /><span /><span /></div></div></ViewTransition>;
}
