# Survey Editor

基于 Next.js、PostgreSQL 与 Pusher Protocol 的问卷编辑和实时协作项目。

## Local development

```bash
pnpm db:push
pnpm realtime:up
pnpm dev
```

开发环境可通过 `.env.local` 将实时提供方切换为本地 Soketi：

```env
REALTIME_PROVIDER=soketi
NEXT_PUBLIC_REALTIME_PROVIDER=soketi
```

停止本地实时服务：

```bash
pnpm realtime:down
```

## Performance reports

- [题目创建性能优化](docs/question-creation-performance.md)
- [实时协作性能优化](docs/realtime-collaboration-performance.md)

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```
