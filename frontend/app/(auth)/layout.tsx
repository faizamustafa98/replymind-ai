import ShowcasePanel from "@/src/components/auth/ShowcasePanel";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-svh flex items-center justify-center bg-bg-base p-6 md:p-10 overflow-x-hidden">
      {/* No overflow-hidden here so the showcase cards can break out past the
          panel's top / bottom / right edges, like the reference mock. */}
      <main className="relative w-full max-w-[1040px] bg-white rounded-[2rem] shadow-[0_40px_80px_-20px_rgba(30,34,148,0.18)] flex flex-col-reverse lg:flex-row min-h-[620px]">
        {/* Left Panel — the form */}
        <section className="flex-1 flex flex-col justify-center px-7 py-8 lg:px-12 lg:py-10 bg-white rounded-[2rem] lg:rounded-r-none">
          {children}
        </section>

        {/* Right Panel — decorative brand showcase */}
        <ShowcasePanel />
      </main>
    </div>
  );
}
