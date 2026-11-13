// Vigia externo: abre a rota de saúde de cada sistema e avisa no Telegram quando cai e quando volta.
// Nada de cliente aqui: os alvos vêm do segredo ALVOS ([{"nome":"sistema-1","url":"https://.../api/saude"}]).
// O estado (quem estava fora) vem e vai para estado.json, que o workflow guarda no cache entre execuções.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const ESTADO = 'estado.json'
const TENTATIVAS = 2 // aviso só depois de 2 falhas seguidas, para não acordar ninguém por um tropeço
const ESPERA_MS = Number(process.env.ESPERA_MS ?? 60_000)
const TEMPO_MS = 15_000

const alvos = JSON.parse(process.env.ALVOS || '[]')
if (!Array.isArray(alvos) || alvos.length === 0) {
  console.log('Nenhum alvo configurado.')
  process.exit(0)
}
const estado = existsSync(ESTADO) ? JSON.parse(readFileSync(ESTADO, 'utf8')) : {}

async function responde(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(TEMPO_MS), headers: { 'user-agent': 'vigia' } })
    return r.ok
  } catch {
    return false
  }
}

async function telegram(texto) {
  const { TELEGRAM_ALERTA_TOKEN: token, TELEGRAM_ALERTA_CHAT_ID: chat } = process.env
  if (!token || !chat) {
    console.log(`(sem Telegram) ${texto}`)
    return
  }
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: texto }),
  })
  if (!r.ok) throw new Error(`Telegram respondeu ${r.status}`)
}

const agora = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
let falhou = false

for (const { nome, url } of alvos) {
  let ok = await responde(url)
  for (let i = 1; !ok && i < TENTATIVAS; i++) {
    await new Promise((r) => setTimeout(r, ESPERA_MS))
    ok = await responde(url)
  }
  const estavaFora = Boolean(estado[nome])
  if (!ok && !estavaFora) {
    estado[nome] = agora()
    await telegram(`Fora do ar: ${nome}, desde ${estado[nome]}. O vigia confere de novo a cada 10 minutos.`)
  } else if (ok && estavaFora) {
    await telegram(`Voltou: ${nome}, às ${agora()}. Estava fora desde ${estado[nome]}.`)
    delete estado[nome]
  }
  console.log(`${nome}: ${ok ? 'no ar' : 'fora'}`)
  if (!ok) falhou = true
}

writeFileSync(ESTADO, JSON.stringify(estado))
// limite: a saída é sempre 0, para a falha de um cliente não marcar o workflow como quebrado e gerar e-mail do GitHub
if (falhou) console.log('Há sistema fora; aviso enviado na primeira detecção.')
