export interface GitHubRelease {
  tag_name: string
  name: string
  body: string
  html_url: string
  published_at: string
  assets: Array<{
    name: string
    browser_download_url: string
    size: number
  }>
}

export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseUrl: string
  releaseName: string
  releaseBody: string
  publishedAt: string
  downloadUrl?: string
}

const REPO = 'BZ2116/wonder'
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`

function normalizeVersion(v: string): string {
  return v.replace(/^v/, '')
}

export function isNewerVersion(current: string, latest: string): boolean {
  const c = normalizeVersion(current).split('.').map(Number)
  const l = normalizeVersion(latest).split('.').map(Number)
  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const ci = c[i] || 0
    const li = l[i] || 0
    if (li > ci) return true
    if (li < ci) return false
  }
  return false
}

export async function checkForUpdate(currentVersion: string): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(API_URL, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null

    const release: GitHubRelease = await res.json()
    const latestVersion = normalizeVersion(release.tag_name)
    const hasUpdate = isNewerVersion(currentVersion, latestVersion)

    const downloadAsset = release.assets.find(a => a.name.endsWith('.exe'))

    return {
      currentVersion,
      latestVersion,
      hasUpdate,
      releaseUrl: release.html_url,
      releaseName: release.name,
      releaseBody: release.body,
      publishedAt: release.published_at,
      downloadUrl: downloadAsset?.browser_download_url,
    }
  } catch {
    return null
  }
}
