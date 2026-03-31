export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-0">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
