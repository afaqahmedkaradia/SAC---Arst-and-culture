import { mediaUrl, placeholderCover } from "@/lib/constants";

// A project cover: the uploaded image, or flat placeholder shapes.
export function Cover({ id, path, className = "" }: { id: string; path: string | null; className?: string }) {
  const src = mediaUrl(path);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`w-full h-full object-cover ${className}`} loading="lazy" />;
  }
  const c = placeholderCover(id);
  return (
    <span aria-hidden="true" className={`block relative w-full h-full overflow-hidden ${className}`} style={{ background: c.background }}>
      <span style={c.a} />
      <span style={c.b} />
    </span>
  );
}
