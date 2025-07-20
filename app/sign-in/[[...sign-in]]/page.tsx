import { SignIn } from "@clerk/nextjs"

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <SignIn
        appearance={{
          baseTheme: undefined,
          variables: {
            colorPrimary: "#3b82f6",
            colorBackground: "#0f172a",
            colorInputBackground: "#1e293b",
            colorInputText: "#f1f5f9",
          },
          elements: {
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
            card: "bg-slate-900 border-slate-700",
            headerTitle: "text-white",
            headerSubtitle: "text-slate-300",
          },
        }}
      />
    </div>
  )
}
