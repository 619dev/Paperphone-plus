const { build } = require('esbuild')
const Module = require('node:module')
const assert = require('node:assert/strict')
const path = require('node:path')

async function run() {
  const storage=new Map()
  global.__syncState={user:{id:'a'}}
  const messages=new Map()
  let flushed=0, fail=false, cursorWrites=0
  global.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>{
    assert.ok(flushed>=messages.size,'ciphertexts must be durably flushed before cursor advancement')
    storage.set(k,v);cursorWrites++
  }}
  global.__dispatch=async message=>{
    assert.equal(message.offline,true)
    assert.equal(message.type,'message')
    messages.set(message.id,message)
  }
  global.__flush=()=>{ if(fail)throw new Error('storage quota');flushed=messages.size }
  let pages=0
  global.__syncGet=async url=>{
    const cursor=Number(new URL(url,'http://test').searchParams.get('after'))
    pages++
    return {messages:[{id:String(cursor+1),server_seq:cursor+1,group_id:'g'}],next_cursor:cursor+1,has_more:cursor<104}
  }
  const mocks={
    './http':'export const get = url => globalThis.__syncGet(url)',
    './socket':'export const dispatchIncoming = message => globalThis.__dispatch(message)',
    '../store':'export const useStore={getState:()=>globalThis.__syncState}; export const flushMessageCache=()=>globalThis.__flush()'
  }
  const result=await build({stdin:{contents:"export * from './src/api/sync'; export * from './src/api/groupHistory'",resolveDir:path.resolve(__dirname,'..')},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'adapters',setup(b){
    b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'mock'}:undefined)
    b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}))
  }}]})
  const mod=new Module(path.resolve(__dirname,'sync-runtime.cjs'),module)
  mod.filename=path.resolve(__dirname,'sync-runtime.cjs');mod.paths=module.paths
  mod._compile(result.outputFiles[0].text,mod.filename)
  const api=mod.exports
  const job=api.syncMessages()
  assert.equal(api.syncMessages(),job,'one cursor loop per account')
  await job
  assert.equal(pages,105,'catch-up is not truncated after 100 pages')
  assert.equal(messages.size,105)
  assert.equal(storage.get('pp_sync_cursor:a'),'105')
  fail=true
  await assert.rejects(api.syncMessages(),/storage quota/)
  assert.equal(storage.get('pp_sync_cursor:a'),'105','storage failure never advances cursor')
  fail=false
  await api.syncMessages()
  assert.equal(messages.size,106,'retried page deduplicates already-delivered ciphertext')
  const before=cursorWrites
  global.__syncGet=async()=>{throw new Error('network')}
  await assert.rejects(api.syncMessages(),/network/)
  assert.equal(cursorWrites,before)
  global.__syncGet=async()=>({messages:[],next_cursor:106,has_more:true})
  await assert.rejects(api.syncMessages(),/未能继续/)
  let release
  global.__syncGet=()=>new Promise(resolve=>{release=resolve})
  const old=api.syncMessages()
  __syncState.user={id:'b'}
  global.__syncGet=async()=>({messages:[],next_cursor:0,has_more:false})
  await api.syncMessages()
  const size=messages.size
  release({messages:[{id:'old-account'}],next_cursor:107,has_more:false})
  await old
  assert.equal(messages.size,size,'an old account response never enters the new account cache')
  assert.equal(storage.get('pp_sync_cursor:a'),'106')
  let historyPages=0
  global.__syncGet=async url=>{
    const before=Number(new URL(url,'http://test').searchParams.get('before_seq')||2018)
    historyPages++
    const high=Math.min(2017,before-1),low=Math.max(1,high-999)
    return Array.from({length:high-low+1},(_,i)=>({id:String(low+i),server_seq:low+i,ts:1}))
  }
  const history=await api.getGroupHistory('g')
  assert.equal(historyPages,3)
  assert.equal(history.length,2017)
  assert.equal(history[0].server_seq,1)
  assert.equal(history.at(-1).server_seq,2017,'same-timestamp history pages are complete and ordered')
  console.log('PASS: complete multi-page catch-up, deduplication, cache-before-cursor, storage/network failures, nonadvancing cursor and concurrent account isolation')
}
run().catch(error=>{console.error(error);process.exitCode=1})
