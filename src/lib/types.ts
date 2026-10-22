export type Profile = {
  id: string;
  username: string;
  display_name: string;
  role: "artist" | "member";
  artist_status: "none" | "pending" | "approved" | "declined";
  is_admin: boolean;
  headline: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  instagram: string | null;
  work_link: string | null;
  avatar_path: string | null;
  banner_color: string;
  disciplines: string[];
  available_for: string[];
  created_at: string;
};

export type PersonLite = Pick<Profile, "id" | "username" | "display_name" | "avatar_path" | "banner_color">;

export type ProjectCard = {
  id: string;
  title: string;
  discipline: string;
  cover_path: string | null;
  featured: boolean;
  feedback_open: boolean;
  status: string;
  published_at: string | null;
  owner: PersonLite | null;
  appreciations: { count: number }[];
};

export const PROJECT_CARD_SELECT =
  "id,title,discipline,cover_path,featured,feedback_open,status,published_at," +
  "owner:profiles!projects_owner_id_fkey(id,username,display_name,avatar_path,banner_color)," +
  "appreciations(count)";

export function countOf(rel: { count: number }[] | null | undefined): number {
  return rel?.[0]?.count ?? 0;
}
