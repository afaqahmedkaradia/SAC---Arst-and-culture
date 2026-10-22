import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page py-20 flex flex-col gap-4 items-start">
      <h1 className="h-display m-0 text-4xl">We couldn&apos;t find that page</h1>
      <p className="m-0 text-body">It may have been moved, unpublished or never existed.</p>
      <Link href="/" className="btn btn-primary">Back to Discover</Link>
    </main>
  );
}
