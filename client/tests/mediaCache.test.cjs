const { build } = require('esbuild')
const Module = require('node:module')
const assert = require('node:assert/strict')
const path = require('node:path')
async function run() {
  const values = new Map([['user', '{"id":"alice"}']])
  global.localStorage = { getItem: key => values.get(key) || null }
  const events = {}
  global.window = { location: { origin: 'https://app.example', href: 'https://app.example/' }, addEventListener: (name, cb) => { events[name] = cb } }
  const entries = new Map()
  global.caches = { open: async () => ({ match: async key => entries.get(key.url)?.clone(), put: async (key, res) => { entries.set(key.url, res.clone()) } }) }
  const result = await build({ entryPoints: [path.resolve(__dirname, '../src/utils/mediaCache.ts')], bundle: true, platform: 'node', format: 'cjs', write: false,
    define: { 'import.meta.env.VITE_API_URL': '""' }, plugins: [{ name: 'http', setup(b) {
      b.onResolve({ filter: /api\/http/ }, () => ({ path: 'http', namespace: 'mock' }))
      b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export const normalizeFileUrl = value => value' }))
    } }] })
  const mod = new Module(__filename, module)
  mod.paths = module.paths
  mod._compile(result.outputFiles[0].text, __filename)
  const { cachedMediaBlob } = mod.exports
  let count = 0
  global.fetch = async () => { count++; return new Response('original bytes') }
  const [a, b] = await Promise.all([cachedMediaBlob('/a.jpg'), cachedMediaBlob('/a.jpg')])
  assert.equal(await a.text(), 'original bytes')
  assert.equal(await b.text(), 'original bytes')
  assert.equal(count, 1, 'concurrent consumers share one download')
  await cachedMediaBlob('/a.jpg')
  assert.equal(count, 1, 'navigation reads persistent storage')
  events.online()
  await cachedMediaBlob('/a.jpg')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(count, 2, 'reconnect revalidates once')
  global.fetch = async () => { throw new Error('offline') }
  assert.equal(await (await cachedMediaBlob('/a.jpg')).text(), 'original bytes')
  values.set('user', '{"id":"bob"}')
  await assert.rejects(() => cachedMediaBlob('/a.jpg'), /offline/, 'accounts have separate caches')
  global.caches.open = async () => { throw new Error('unavailable') }
  global.fetch = async () => new Response('fallback')
  assert.equal(await (await cachedMediaBlob('/b.jpg')).text(), 'fallback')
  console.log('PASS: persistent media cache, download deduplication, reconnect refresh, offline fallback, account isolation and unavailable storage')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
