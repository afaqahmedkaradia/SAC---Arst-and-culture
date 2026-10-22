import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer, canDraft, isApprovedArtist } from "@/lib/viewer";
import { ProjectEditor } from "../ProjectEditor";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  const viewer = await requireViewer("/dashboard/projects/new");
  if (!canDraft(viewer.profile)) {
    return (
      <main className="page py-16 max-w-[640px] flex flex-col gap-4">
        <h1 className="h-display m-0 text-3xl">Projects are for artist accounts</h1>
        <p className="m-0 text-body">Request an artist account from your dashboard. A community curator will review it.</p>
        <Link href="/dashboard" className="btn btn-primary self-start">Go to your dashboard</Link>
      </main>
    );
  }
  return (
    <ProjectEditor
      userId={viewer.id}
      canPublish={isApprovedArtist(viewer.profile)}
      initial={{
        title: "",
        summary: "",
        discipline: viewer.profile.disciplines[0] ?? "Visual art",
        tags: [],
        cover_path: null,
        feedback_open: true,
        feedback_question: "",
        blocks: [{ kind: "image" }, { kind: "text", text_body: "" }],
        credits: [],
      }}
    />
  );
}
