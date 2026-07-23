import { VerifierApp } from './verifier-app'

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <VerifierApp slug={slug} />
}
