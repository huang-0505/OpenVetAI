import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isProtectedRoute = createRouteMatcher(["/admin(.*)", "/dashboard(.*)", "/settings(.*)"])

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect()
  }
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
