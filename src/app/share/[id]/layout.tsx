export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="max-w-4xl mx-auto mt-6">
      <h1 className="text-2xl font-semibold mb-4">Shared 3D Project</h1>
      {children}
    </section>
  );
}
