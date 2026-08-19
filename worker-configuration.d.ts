interface __BaseEnv_Env {
  DB: D1Database
  ASSETS: Fetcher
  PUBLIC_ORIGIN: string
  VITE_BASE_PATH: string
  VITE_SITE_URL: string
}

declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import('./src/worker')
  }

  interface Env extends __BaseEnv_Env {}
}

interface Env extends __BaseEnv_Env {}

type StringifyValues<EnvType extends Record<string, unknown>> = {
  [Binding in keyof EnvType]: EnvType[Binding] extends string ? EnvType[Binding] : string
}

declare namespace NodeJS {
  interface ProcessEnv
    extends StringifyValues<
      Pick<Cloudflare.Env, 'PUBLIC_ORIGIN' | 'VITE_BASE_PATH' | 'VITE_SITE_URL'>
    > {}
}
