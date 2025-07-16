// app/page.tsx – Server Component
import PageClient from "./page-client"

export const dynamic = "force-dynamic" // opt-out of static export

export default function Page() {
  return <PageClient />
}
