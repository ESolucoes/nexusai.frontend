export function toRelative(url: string) {
  if (!url) return url
  return url.replace(/^https?:\/\/[^/]+/i, '') || url
}

export async function forceDownload(url: string, filename?: string) {
  const rel = toRelative(url)
  const res = await fetch(rel, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename || (rel.split('/').pop() || 'arquivo')
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(href)
}
