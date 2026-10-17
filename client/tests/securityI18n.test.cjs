const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { build } = require('esbuild')

async function run() {
  const languages = ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'ru', 'es']
  const directory = path.resolve(__dirname, '..')
  const source = languages.map(lang => `export {${lang}} from './src/i18n/locales/${lang}'`).join(';') + ";export * from './src/i18n';export * from './src/i18n/security'"
  const result = await build({ stdin: { contents: source, resolveDir: directory }, bundle: true, platform: 'node', format: 'cjs', write: false })
  const mod = new Module(path.join(__dirname, 'i18n-runtime.cjs'), module)
  mod.filename = path.join(__dirname, 'i18n-runtime.cjs'); mod.paths = module.paths
  mod._compile(result.outputFiles[0].text, mod.filename)
  const api = mod.exports
  const keys = Object.keys(api.zh).filter(key => /^(verify|crypto|grouptrust)\./.test(key)).concat(['safety.description', 'safety.verify_steps', 'chat.presentation_password_prompt', 'chat.presentation_unlock_password_prompt'])
  assert.ok(keys.length >= 92)
  const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
  let language = 'zh'
  global.localStorage = { getItem: key => key === 'lang' ? language : null }
  for (const lang of languages) {
    const locale = api[lang]
    const ast = ts.createSourceFile(lang + '.ts', fs.readFileSync(path.join(directory, 'src/i18n/locales', lang + '.ts'), 'utf8'), ts.ScriptTarget.Latest, true)
    const seen = new Set()
    function visit(node) {
      if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name)) {
        assert.ok(!seen.has(node.name.text), `${lang}: duplicate key ${node.name.text}`)
        seen.add(node.name.text)
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
    for (const key of keys) {
      assert.ok(Object.hasOwn(locale, key), `${lang}: missing ${key}; fallback is not a translation`)
      assert.equal(typeof locale[key], 'string')
      assert.ok(locale[key].trim(), `${lang}: empty ${key}`)
      assert.deepEqual(placeholders(locale[key]), placeholders(api.zh[key]), `${lang}: placeholder mismatch in ${key}`)
      assert.equal(api.t(key, lang), locale[key])
    }
    language = lang
    assert.equal(api.securityText('verify.notice'), locale['verify.notice'], 'non-React messages use the current language')
    assert.equal(api.localizeSecurityApiError('Not a group member'), locale['grouptrust.not_member'])
    assert.equal(api.localizeSecurityApiError('Sender key epoch expired; refresh group membership'), locale['grouptrust.epoch_expired'])
    assert.ok(api.t('verify.instructions', lang).includes('paperphone.app'), 'protocol verification text is never translated')
    const body = 'paperphone.app {id} $& <unchanged>'
    assert.ok(api.t('verify.unsigned_history', lang, { text: body }).includes(body), 'user text is interpolated verbatim once')
    assert.ok(api.t('grouptrust.signature_title', lang, { id: '$&{text}' }).includes('$&{text}'))
  }
  language = 'en'
  const pendingError = new api.SecurityError('crypto.verify_member', { id: 'member-$&' })
  language = 'ja'
  assert.equal(api.securityErrorText(pendingError), api.t('crypto.verify_member', 'ja', { id: 'member-$&' }))
  assert.equal(api.securityErrorText(new Error('native error details')), api.ja['verify.signature_failed'])
  assert.equal(api.securityErrorText(api.securityApiException('Group member limit exceeded')), api.ja['grouptrust.member_limit'])
  language = 'unknown'
  assert.equal(api.securityText('verify.notice'), api.zh['verify.notice'])
  assert.equal(api.zh['verify.notice'], '文本外观密码是检验对方是否可信任的凭证，文本外观密码只在线下交流，不要以任何形式发到网上。')
  assert.equal(api.localizeSecurityApiError('unrelated error'), 'unrelated error')
  console.log(`PASS: ${keys.length} security text keys × 8 languages, no duplicates or missing keys, matching placeholders, live locale changes and unchanged protocol/user text`)
}
run().catch(error => { console.error(error); process.exitCode = 1 })
