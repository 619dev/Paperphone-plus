const { build } = require('esbuild')
const Module = require('node:module')
const assert = require('node:assert/strict')
const path = require('node:path')

async function run() {
  const storage = new Map([['serverUrl', 'https://server.example'], ['token', 'old'], ['refreshToken', 'refresh']])
  global.localStorage = { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) }
  global.window = { location: { origin: 'https://client.example' } }
  global.__attachmentStore = { getState: () => ({ setToken: (token) => storage.set('token', token) }) }
  const mocks = {
    '../store': 'export const useStore = globalThis.__attachmentStore',
    '../utils/session': 'export const endSession = () => {}; export const isExplicitLogoutSignal = () => false',
  }
  const result = await build({ entryPoints: [path.resolve(__dirname, '../src/api/http.ts')], bundle: true,
    platform: 'node', format: 'cjs', write: false, define: { 'import.meta.env.VITE_API_URL': '""' },
    plugins: [{ name: 'adapters', setup(b) {
      b.onResolve({ filter: /.*/ }, a => mocks[a.path] ? { path: a.path, namespace: 'mock' } : undefined)
      b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ contents: mocks[a.path], loader: 'js' }))
    } }] })
  const mod = new Module(__filename, module)
  mod.filename = __filename
  mod.paths = module.paths
  mod._compile(result.outputFiles[0].text, __filename)
  const api = mod.exports
  const calls = []
  global.fetch = async (url, opts) => {
    calls.push({ url, opts })
    if (url.endsWith('/api/auth/refresh')) return Response.json({ token: 'new' })
    if (opts.headers.Authorization === 'Bearer old') return new Response('', { status: 401 })
    return new Response('attachment bytes')
  }
  const blob = await api.downloadFileFromServer('/api/files/temporary/file')
  assert.equal(await blob.text(), 'attachment bytes')
  assert.equal(calls.length, 3)
  assert.equal(calls[0].opts.headers.Authorization, 'Bearer old')
  assert.equal(calls[2].opts.headers.Authorization, 'Bearer new')
  const before = calls.length
  for (const invalid of ['https://evil.example/api/files/file', '/api/users/me', '//evil.example/api/files/key', '/api/files/../users/me']) {
    await assert.rejects(() => api.downloadFileFromServer(invalid))
  }
  assert.equal(calls.length, before, 'foreign URLs must never receive a request or bearer token')
  storage.set('legacyR2PublicUrl:https://server.example', 'https://legacy.example')
  await api.downloadFileFromServer('https://legacy.example/uploads/old-file')
  assert.equal(calls.at(-1).url, 'https://server.example/api/files/uploads/old-file')
  global.fetch = async () => Response.json({ avatar: '/api/files/permanent/a', members: [{ from_avatar: '/api/files/permanent/b' }] })
  const data = await api.get('/api/groups/test')
  assert.equal(data.avatar, 'https://server.example/api/files/permanent/a')
  assert.equal(data.members[0].from_avatar, 'https://server.example/api/files/permanent/b')
  storage.delete('serverUrl')
  await api.downloadFileFromServer('/api/files/local')
  console.log('PASS: authenticated attachment download, token refresh, external URL rejection, legacy R2 mapping, same-origin fallback and nested avatar normalization')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
