const { build } = require('esbuild')
const Module = require('node:module')
const assert = require('node:assert/strict')
const { webcrypto } = require('node:crypto')
const path = require('node:path')

async function run() {
  global.crypto = webcrypto
  global.window = new EventTarget()
  const storage = new Map()
  global.localStorage = { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) }
  global.__secrets = new Map()
  global.__people = {}
  global.__outbox = []
  global.__history = []
  global.__sodium = require('libsodium-wrappers-sumo')
  const mocks = {
    'libsodium-wrappers-sumo': 'export default globalThis.__sodium',
    '../api/http': 'export const get = async p => p.startsWith("/api/messages/") ? globalThis.__history : globalThis.__people[p.split("/").pop()]',
    '../api/socket': 'export const sendWs = m => { globalThis.__outbox.push(m); return true }',
    './keystore': 'export const getKeys = () => globalThis.__keys',
    './browserSecretStore': `export const getBrowserSecret = async (a,n) => globalThis.__secrets.get(a+':'+n) || null;
      export const setBrowserSecret = async (a,n,v) => {globalThis.__secrets.set(a+':'+n,v)};
      export const deleteBrowserSecret = async (a,n) => {globalThis.__secrets.delete(a+':'+n)}`,
  }
  const result = await build({ stdin: { contents: `export * from './src/crypto/authenticatedMessaging'; export * from './src/crypto/ratchet'; export * from './src/crypto/presentationCrypto'`, resolveDir: path.resolve(__dirname, '..') }, bundle: true, platform: 'node', format: 'cjs', write: false, external: ['crystals-kyber-js'], plugins: [{ name: 'test-adapters', setup(b) {
    b.onResolve({ filter: /.*/ }, a => mocks[a.path] ? { path: a.path, namespace: 'mock' } : undefined)
    b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ contents: mocks[a.path], loader: 'js' }))
  } }] })
  const mod = new Module(path.resolve(__dirname, 'runtime.cjs'), module)
  mod.filename = path.resolve(__dirname, 'runtime.cjs')
  mod.paths = module.paths
  mod._compile(result.outputFiles[0].text, mod.filename)
  const api = mod.exports
  const alice = { ...(await api.generateKeyPair()), sign: await api.generateSignKeyPair() }
  const bob = { ...(await api.generateKeyPair()), sign: await api.generateSignKeyPair() }
  function use(id, person) {
    localStorage.setItem('user', JSON.stringify({ id }))
    global.__keys = { ik_pub: person.publicKey, ik_priv: person.privateKey, sign_pub: person.sign.publicKey, sign_priv: person.sign.privateKey }
  }
  __people.a = { ik_pub: alice.publicKey, kem_pub: alice.sign.publicKey }
  __people.b = { ik_pub: bob.publicKey, kem_pub: bob.sign.publicKey }
  use('a', alice)
  const pair = await api.encryptSignedPair('b', bob.publicKey, bob.sign.publicKey, 'hello', 'text')
  const message = { from: 'a', to: 'b', msg_type: 'text', ...pair }
  assert.equal(await api.decryptSignedMessage(message), 'hello', 'sender history verifies')
  use('b', bob)
  assert.equal(await api.decryptSignedMessage(message), 'hello', 'recipient verifies')
  await assert.rejects(api.decryptSignedMessage({ ...message, msg_type: 'image' }))
  await assert.rejects(api.decryptSignedMessage({ ...message, ciphertext: pair.ciphertext.slice(0, -2) + 'AA' }))
  await assert.rejects(api.decryptSignedMessage({ ...message, from: 'b' }))
  await assert.rejects(api.decryptSignedMessage({ ...message, to: 'a' }))
  const brokenHeader = JSON.parse(pair.header.slice(5))
  brokenHeader.signature = pair.ciphertext
  await assert.rejects(api.decryptSignedMessage({ ...message, header: 'pps1.' + JSON.stringify(brokenHeader) }))
  await assert.rejects(api.startIdentityVerification('a'), /文本外观密码/)
  await api.enablePresentationCrypto('buddha', 'offline-secret-password')
  const exact = await api.encryptIdentityText('test-binding')
  assert.equal(await api.decryptIdentityText('test-binding', exact), 'paperphone.app')
  await assert.rejects(api.decryptIdentityText('tampered-binding', exact))
  use('a', alice)
  await api.startIdentityVerification('b')
  assert.equal(await api.identityVerified('b', bob.publicKey), false)
  const first = __outbox.shift()
  use('b', bob)
  await api.enablePresentationCrypto('buddha', 'wrong-secret-password')
  await assert.rejects(api.decryptSignedMessage({ ...first, from: 'a' }))
  assert.equal(await api.identityVerified('a', alice.publicKey), false)
  await api.enablePresentationCrypto('buddha', 'offline-secret-password')
  await api.decryptSignedMessage({ ...first, from: 'a' })
  assert.equal(await api.identityVerified('a', alice.publicKey), false)
  const second = __outbox.shift()
  use('a', alice)
  await api.decryptSignedMessage({ ...second, from: 'b' })
  assert.equal(await api.identityVerified('b', bob.publicKey), true)
  const third = __outbox.shift()
  use('b', bob)
  await api.decryptSignedMessage({ ...third, from: 'a' })
  assert.equal(await api.identityVerified('a', alice.publicKey), true)
  await api.decryptSignedMessage({ ...first, from: 'a' })
  assert.equal(__outbox.length, 0, 'replayed proof sends no extra response')
  use('a', alice)
  await api.startIdentityVerification('b')
  assert.equal(await api.identityVerified('b', bob.publicKey), false, 'explicit re-verification requires a fresh challenge')
  const fresh = __outbox.shift()
  use('b', bob)
  await api.decryptSignedMessage({ ...fresh, from: 'a' })
  const freshReply = __outbox.shift()
  use('a', alice)
  await api.decryptSignedMessage({ ...freshReply, from: 'b' })
  assert.equal(await api.identityVerified('b', bob.publicKey), true)
  const freshAck = __outbox.shift()
  use('b', bob)
  await api.decryptSignedMessage({ ...freshAck, from: 'a' })
  const unsigned = await api.encryptHybrid(bob.publicKey, null, 'forged')
  await assert.rejects(api.decryptSignedMessage({ from: 'a', to: 'b', msg_type: 'text', ...unsigned }), /未签名/)
  const pinned = JSON.parse(__secrets.get('b:identity-verification-v1:a'))
  __secrets.set('b:identity-verification-v1:a', JSON.stringify({ ...pinned, nonce: crypto.randomUUID(), received: undefined, acknowledged: false }))
  await api.decryptSignedMessage({ ...first, from: 'a' })
  assert.equal(await api.identityVerified('a', alice.publicKey), false, 'old proof cannot acknowledge a new local challenge')
  __people.a = { ...__people.a, ik_pub: bob.publicKey }
  await assert.rejects(api.decryptSignedMessage(message))
  assert.equal(await api.identityVerified('a', bob.publicKey), false)
  // Opening profiles automatically completes a handshake from signed history,
  // without visiting Chat or resetting challenges on repeated refreshes.
  __secrets.clear(); __outbox.length=0; __history=[]
  __people.a={ik_pub:alice.publicKey,kem_pub:alice.sign.publicKey}
  const peerA={id:'a',...__people.a},peerB={id:'b',...__people.b}
  use('a',alice)
  api.lockPresentationCrypto()
  assert.equal(await api.refreshContactVerification(peerB),'locked')
  assert.equal(__outbox.length,0,'a locked password never sends an automatic proof')
  await api.enablePresentationCrypto('buddha','offline-secret-password')
  const opening=api.refreshContactVerification(peerB)
  assert.equal(api.refreshContactVerification(peerB),opening,'duplicate profile events share one refresh')
  assert.equal(await opening,'pending')
  const automaticFirst=__outbox.shift()
  const originalNonce=JSON.parse(__secrets.get('a:identity-verification-v1:b')).nonce
  assert.equal(await api.refreshContactVerification(peerB),'pending')
  assert.equal(__outbox.length,0,'rapid reopening does not duplicate proofs')
  assert.equal(JSON.parse(__secrets.get('a:identity-verification-v1:b')).nonce,originalNonce)
  use('b',bob); __history=[{...automaticFirst,from:'a'}]
  assert.equal(await api.refreshContactVerification(peerA),'pending')
  const automaticSecond=__outbox.shift()
  assert.ok(automaticSecond)
  use('a',alice); __history=[{...automaticSecond,from:'b'}]
  assert.equal(await api.refreshContactVerification(peerB),'verified')
  const automaticThird=__outbox.shift()
  use('b',bob); __history=[{...automaticThird,from:'a'}]
  assert.equal(await api.refreshContactVerification(peerA),'verified')
  assert.equal(await api.refreshContactVerification(peerA),'verified')
  assert.equal(__outbox.length,0,'refreshing verified receipts does not resend them')
  const trustBefore=JSON.parse(__secrets.get('b:identity-verification-v1:a'))
  assert.equal(await api.refreshIdentityTrust(peerA),'verified','group member snapshots reuse the completed trust record')
  assert.equal(await api.refreshContactVerification({...peerA,kem_pub:bob.sign.publicKey}),'changed')
  assert.equal(JSON.parse(__secrets.get('b:identity-verification-v1:a')).sign,trustBefore.sign,'refresh never replaces a pinned key')
  assert.equal(await api.identityVerified('a',alice.publicKey,alice.sign.publicKey),false,'a key change revokes the old green badge globally')
  assert.equal(__outbox.length,0,'changed keys require explicit offline confirmation')
  console.log('PASS: signed round-trip, self history, tampering, wrong password, mutual challenge/receipt, replay, unsigned downgrade, identity replacement, automatic profile/history refresh, cooldown and group trust invalidation')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
