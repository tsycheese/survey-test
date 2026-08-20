import Pusher from "pusher"

export { COLLABORATION_EVENTS, getSurveyChannel } from "@/lib/realtime-shared"
export type {
  LockInfo,
  MemberInfo,
  QuestionData,
  SurveyData,
  SyncEventData,
} from "@/lib/realtime-shared"

const useLocalRealtime = process.env.REALTIME_PROVIDER === "soketi"

// 服务端实时发布实例。默认使用云端 Pusher；开发时可切换到本地 Soketi。
export const pusherServer = useLocalRealtime
  ? new Pusher({
      appId: process.env.SOKETI_APP_ID ?? "survey-local",
      key: process.env.SOKETI_APP_KEY ?? "survey-local-key",
      secret: process.env.SOKETI_APP_SECRET ?? "survey-local-secret",
      host: process.env.SOKETI_HOST ?? "127.0.0.1",
      port: process.env.SOKETI_PORT ?? "6001",
      useTLS: false,
      timeout: 2000,
    })
  : new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
      timeout: 5000,
    })

export const realtimeProvider = useLocalRealtime ? "soketi" : "pusher"
