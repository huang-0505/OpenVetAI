import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs"
import DataIngestionPortalClient from "./page-client"

export default function HomePage() {
  return (
    <>
      <SignedIn>
        <DataIngestionPortalClient />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  )
}
