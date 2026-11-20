export function SetupNotice({ missing }: { missing: string[] }) {
  if (!missing.length) return null;
  return (
    <div className="bg-gold-tint border-[1.5px] border-gold rounded-xl px-5 py-4 flex flex-col gap-1.5 text-[15px]">
      <strong>Finish the setup to send newsletters</strong>
      <span className="text-body">
        Add these in Webflow Cloud under your environment&apos;s variables and secrets, then redeploy:{" "}
        {missing.map((m, i) => (
          <span key={m}>{i ? ", " : ""}<code className="text-[13px] bg-white px-1.5 py-0.5 rounded">{m}</code></span>
        ))}
        . You can write drafts in the meantime.
      </span>
    </div>
  );
}
