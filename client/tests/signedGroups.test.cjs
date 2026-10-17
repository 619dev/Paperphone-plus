const { build } = require('esbuild')
const Module = require('node:module')
const assert = require('node:assert/strict')
const { webcrypto } = require('node:crypto')
const path = require('node:path')

async function run() {
  global.crypto = webcrypto
  global.window = new EventTarget()
  const storage = new Map()
  global.localStorage = { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) }
  global.__secrets = new Map()
  global.__sodium = require('libsodium-wrappers-sumo')
  global.__people = {}
  global.__distributions = []
  global.__epoch = 1
  global.__members = ['a','b','c']
  global.__state = { user: { id: 'a' } }
  global.__get = async url => {
    if (url.startsWith('/api/users/')) return __people[url.split('/').pop()]
    if (!__members.includes(__state.user.id)) throw new Error('Not a group member')
    if (url.endsWith('/sender-keys')) return { key_epoch:__epoch, keys: __distributions.filter(d => d.to_id === __state.user.id) }
    return { id:'g', key_epoch: __epoch, members: __members.map(id => ({id, ...__people[id]})) }
  }
  global.__post = async (url, body) => {
    assert.equal(body.key_version, __epoch)
    assert.deepEqual(body.distributions.map(d => d.to_id).sort(), [...__members].sort())
    if (__distributions.some(d => d.from_id === __state.user.id && d.key_version === __epoch)) throw new Error('Already published')
    __distributions.push(...body.distributions.map(d => ({...d, from_id:__state.user.id,key_version:body.key_version})))
    return {ok:true}
  }
  const mocks = {
    '../api/http': 'export const get = p => globalThis.__get(p); export const post = (p,b) => globalThis.__post(p,b)',
    '../api/socket': 'export const sendWs = () => true',
    './keystore': 'export const getKeys = () => globalThis.__keys',
    '../store': 'export const useStore = { getState: () => globalThis.__state }',
    './browserSecretStore': `export const getBrowserSecret = async (a,n) => globalThis.__secrets.get(a+':'+n) || null;
      export const setBrowserSecret = async (a,n,v) => {globalThis.__secrets.set(a+':'+n,v)};
      export const deleteBrowserSecret = async (a,n) => {globalThis.__secrets.delete(a+':'+n)}`,
    'libsodium-wrappers-sumo': 'export default globalThis.__sodium'
  }
  const result = await build({ stdin: { contents: `export * from './src/crypto/signedGroups'; export * from './src/crypto/ratchet'; export * from './src/crypto/groupCrypto'`, resolveDir: path.resolve(__dirname, '..') }, bundle:true, platform:'node', format:'cjs', write:false, external:['crystals-kyber-js'], plugins:[{name:'test-adapters',setup(b){
    b.onResolve({filter:/.*/}, a => mocks[a.path] ? {path:a.path,namespace:'mock'} : undefined)
    b.onLoad({filter:/.*/,namespace:'mock'}, a => ({contents:mocks[a.path],loader:'js'}))
  }}] })
  const mod = new Module(path.resolve(__dirname,'group-runtime.cjs'),module)
  mod.filename = path.resolve(__dirname,'group-runtime.cjs'); mod.paths=module.paths
  mod._compile(result.outputFiles[0].text, mod.filename)
  const api=mod.exports
  const people={}
  for (const id of ['a','b','c','d']) {
    const enc=await api.generateKeyPair(), sign=await api.generateSignKeyPair()
    people[id]={ik_pub:enc.publicKey,ik_priv:enc.privateKey,sign_pub:sign.publicKey,sign_priv:sign.privateKey}
    __people[id]={ik_pub:enc.publicKey,kem_pub:sign.publicKey}
  }
  for (const id of ['a','b','c']) for (const peer of ['a','b','c']) if(id!==peer) {
    __secrets.set(id+':identity-verification-v1:'+peer, JSON.stringify({ik:people[peer].ik_pub,sign:people[peer].sign_pub,own:people[id].ik_pub,ownSign:people[id].sign_pub,nonce:crypto.randomUUID(),received:crypto.randomUUID(),acknowledged:true}))
  }
  async function use(id) {
    await api.flushSenderKeys()
    localStorage.setItem('user',JSON.stringify({id}))
    __state.user={id}; global.__keys=people[id]
    await api.hydrateSenderKeys(id)
  }
  const message = (from, encrypted) => ({ id: crypto.randomUUID(), from,group_id:'g',msg_type:'text',ts:1,...encrypted })
  await use('a')
  const [a1,a2]=await Promise.all([api.ensureGroupSenderKey('g'),api.ensureGroupSenderKey('g')])
  assert.equal(a1.senderKey,a2.senderKey,'concurrent publishers share one key')
  assert.equal(__distributions.filter(d=>d.from_id==='a').length,3)
  const first=message('a',await api.encryptGroupMessage('g','before departure','text',crypto.randomUUID()))
  await use('b')
  assert.deepEqual(await api.decryptGroupMessage(first),{decrypted:'before departure',signature_valid:true,from_nickname:'a',decryption_pending:false})
  assert.equal((await api.decryptGroupMessage({...first,from_nickname:'forged name'})).from_nickname,'a','displayed nickname comes from signed metadata')
  const stolenKey=api.getSenderKey('g','a',1).senderKey
  const savedDistributions=__distributions
  __distributions=__distributions.filter(d=>d.from_id!=='a'||d.to_id!=='b')
  api.clearGroupSenderKeys('g')
  const waiting=await api.decryptGroupMessage(first)
  assert.equal(waiting.signature_valid,true,'valid signatures remain visible while awaiting decryption keys')
  assert.equal(waiting.decryption_pending,true)
  __distributions=savedDistributions
  assert.equal((await api.decryptGroupMessage(first)).decryption_pending,false)

  const departedMessage=message('b',await api.encryptGroupMessage('g','sent while a member','text',crypto.randomUUID()))
  await assert.rejects(api.decryptGroupMessage({...first,msg_type:'image'}))
  await assert.rejects(api.decryptGroupMessage({...first,group_id:'other'}))
  await assert.rejects(api.decryptGroupMessage({...first,from:'c'}))
  await assert.rejects(api.decryptGroupMessage({...first,sender_key_version:2}))
  await assert.rejects(api.decryptGroupMessage({...first,nonce:'bad'}))
  await assert.rejects(api.decryptGroupMessage({...first,ciphertext:first.ciphertext.slice(0,-2)+'AA'}))
  assert.equal((await api.decryptGroupMessage({...first,header:null})).signature_valid,false)
  assert.equal((await api.decryptGroupMessage({...first,header:null},true)).decrypted,'⚠️ 未签名历史群消息：before departure')
  const source=__distributions.find(d=>d.from_id==='a'&&d.to_id==='b')
  await assert.rejects(api.importGroupDistribution('other',source))
  await assert.rejects(api.importGroupDistribution('g',{...source,key_version:2}))
  const savedPin=__secrets.get('b:identity-verification-v1:a')
  __secrets.delete('b:identity-verification-v1:a')
  await assert.rejects(api.decryptGroupMessage(first),/验证群成员身份/)
  __secrets.set('b:identity-verification-v1:a',savedPin)
  __members=['a','c']; __epoch=2
  __distributions=__distributions.filter(d=>d.to_id!=='b')
  await assert.rejects(api.ensureGroupSenderKey('g'),/Not a group member/)
  await use('a')
  api.retireOwnSenderKeys('g','a')
  const second=message('a',await api.encryptGroupMessage('g','after departure','text',crypto.randomUUID()))
  assert.notEqual(api.getSenderKey('g','a',2).senderKey,stolenKey)
  await assert.rejects(api.decryptWithSenderKey(second.ciphertext,second.nonce,stolenKey))
  assert.deepEqual(__distributions.filter(d=>d.from_id==='a'&&d.key_version===2).map(d=>d.to_id).sort(),['a','c'])
  await assert.rejects(api.decryptGroupMessage(departedMessage),/退出当前代次/)
  await assert.rejects(api.decryptGroupMessage(first),/退出当前代次/)
  await use('c')
  await api.fetchGroupKeys('g')
  assert.ok(api.getSenderKey('g','a',1)&&api.getSenderKey('g','a',2),'all epochs retained for offline catch-up')
  assert.equal((await api.decryptGroupMessage(first,true)).decrypted,'before departure')
  assert.equal((await api.decryptGroupMessage(second,true)).decrypted,'after departure')
  assert.equal((await api.decryptGroupMessage(departedMessage,true)).decrypted,'sent while a member','departed sender history remains readable to continuing members')
  const third=message('c',await api.encryptGroupMessage('g','other sender rotated too','text',crypto.randomUUID()))
  assert.equal(third.sender_key_version,2)
  assert.throws(()=>api.storeSenderKey('g','a',awaitableBadKey(),2,true,true),/同一代次/)
  function awaitableBadKey(){return btoa('z'.repeat(32))}
  await use('a')
  assert.equal((await api.decryptGroupMessage(third)).signature_valid,true)
  await use('c')
  assert.equal((await api.decryptGroupMessage(second,true)).signature_valid,true,'archived keys survive account hydration')
  const regularGet=__get
  let release
  __get=()=>new Promise(resolve=>{release=resolve})
  const pendingJob=api.ensureGroupSenderKey('g')
  await use('d')
  release({id:'g',key_epoch:2,members:__members.map(id=>({id,...__people[id]}))})
  await assert.rejects(pendingJob,/账户已切换/)
  __get=regularGet
  await assert.rejects(api.decryptGroupMessage(first,true),/验证群成员身份/)
  console.log('PASS: group signatures/context tampering, pinned identities, signed distribution, concurrent publication, full rotation, departed member exclusion, multi-epoch offline history and account isolation')
}
run().catch(error=>{console.error(error);process.exitCode=1})
