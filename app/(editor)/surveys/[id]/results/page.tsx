import { redirect } from "next/navigation"

export default async function ResultsIndexPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/surveys/${id}/results/overview`)
}
