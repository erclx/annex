/**
 * Serves the static export the way Cloudflare Pages does, for the end-to-end
 * run and the evidence capture.
 *
 * A path resolves as it is, then as `<path>.html`, then as `<path>/index.html`.
 * `python3 -m http.server` does only the first and the last, so it answers `/ask`
 * with a 404, and once the export writes an `ask/` folder of segment payloads
 * beside `ask.html` it would redirect `/ask` into a directory listing instead.
 * Written against `node:http` rather than `Bun.serve`, so it needs neither a
 * dependency nor Bun's type definitions, and Bun runs it as it runs the suite.
 *
 *   bun e2e/serve-export.ts <export directory> <port>
 */
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

const [directory, port] = process.argv.slice(2)

if (!directory || !port) {
  console.error('Usage: bun e2e/serve-export.ts <export directory> <port>')
  process.exit(1)
}

const root = path.resolve(directory)

async function isFile(candidate: string): Promise<boolean> {
  try {
    return (await stat(candidate)).isFile()
  } catch {
    return false
  }
}

/** The file a request path names inside the export, or null for none. */
async function resolveFile(pathname: string): Promise<string | null> {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    // A malformed escape names no file, and a throw here would leave the
    // request open with nothing to answer it.
    return null
  }
  const requested = path.join(root, decoded)
  // A path climbing out of the export names nothing this server holds.
  if (requested !== root && !requested.startsWith(`${root}${path.sep}`))
    return null

  for (const candidate of [
    requested,
    `${requested}.html`,
    path.join(requested, 'index.html'),
  ]) {
    if (await isFile(candidate)) return candidate
  }
  return null
}

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost')
  void resolveFile(pathname).then(async (file) => {
    const notFound = path.join(root, '404.html')
    const served = file ?? ((await isFile(notFound)) ? notFound : null)
    if (served === null) {
      response.writeHead(404).end()
      return
    }
    response.writeHead(file ? 200 : 404, {
      'Content-Type':
        CONTENT_TYPES[path.extname(served)] ?? 'application/octet-stream',
    })
    createReadStream(served).pipe(response)
  })
}).listen(Number(port), () => {
  console.log(`Serving ${root} on http://localhost:${port}`)
})
