import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
            card: "bg-slate-900 border-slate-700",
            headerTitle: "text-white",
            headerSubtitle: "text-slate-300",
            socialButtonsBlockButton: "bg-slate-800 border-slate-600 text-white hover:bg-slate-700",
            formFieldInput: "bg-slate-800 border-slate-600 text-white",
            formFieldLabel: "text-slate-300",
            footerActionLink: "text-blue-400 hover:text-blue-300",
          },
        }}
      />
    </div>
  )
}
