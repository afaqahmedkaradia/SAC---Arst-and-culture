import { initials, mediaUrl, personColor } from "@/lib/constants";
import type { PersonLite } from "@/lib/types";

export function Avatar({ person, size = 36, ring = false }: { person: PersonLite; size?: number; ring?: boolean }) {
  const src = mediaUrl(person.avatar_path);
  const style = {
    width: size,
    height: size,
    background: personColor(person.id, person.banner_color),
    fontSize: Math.max(11, Math.round(size * 0.36)),
    border: ring ? "5px solid #fff" : undefined,
  };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="rounded-full object-cover shrink-0" style={style} />;
  }
  return (
    <span
      aria-hidden="true"
      className="rounded-full shrink-0 flex items-center justify-center font-semibold text-white"
      style={style}
    >
      {initials(person.display_name)}
    </span>
  );
}
