/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  readonly GEMINI_API_KEY: string
  readonly NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string
  readonly VITE_PLAN_1K: string
  readonly VITE_PLAN_5K: string
  readonly VITE_PLAN_10K: string
  readonly VITE_PLAN_20K: string
  readonly VITE_PLAN_40K: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
