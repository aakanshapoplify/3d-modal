export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="max-w-5xl mx-auto mt-6">
      <h1 className="text-2xl font-semibold mb-4">3D Staging Editor</h1>
      {children}
    </section>
  );
}
