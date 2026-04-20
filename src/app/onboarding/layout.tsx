export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-0)",
        color: "var(--fg-0)",
        fontFamily: "var(--sans)",
      }}
    >
      {children}
    </div>
  );
}
