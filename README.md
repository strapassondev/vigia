# vigia

Confere de fora, a cada 10 minutos, se os sistemas estão no ar, e avisa no Telegram quando um cai e quando volta.

O repositório é público para os minutos do GitHub Actions não contarem na cota da organização. Por isso nada dos sistemas fica aqui: os endereços e a conversa do aviso vivem só nos segredos do repositório.

## Como funciona
- `vigia.mjs` abre a rota de saúde de cada alvo. Duas falhas seguidas, com 1 minuto entre elas, contam como fora do ar.
- O aviso sai uma vez quando cai e uma vez quando volta. Quem está fora fica guardado em `estado.json`, no cache do Actions, entre uma execução e outra.
- `manter-vivo` faz um commit por mês, porque o GitHub desliga o agendamento de repositório público parado há 60 dias.
- O agendamento do GitHub pode atrasar de 5 a 15 minutos nos horários cheios: o aviso chega em até cerca de 20 minutos.

## Segredos
| Nome | O que é |
|---|---|
| `ALVOS` | lista JSON com apelido genérico e endereço: `[{"nome":"sistema-1","url":"https://.../api/saude"}]` |
| `TELEGRAM_ALERTA_TOKEN` | token do bot de alertas |
| `TELEGRAM_ALERTA_CHAT_ID` | conversa que recebe os avisos |

## Testar na máquina
`ALVOS='[{"nome":"teste","url":"http://localhost:3000/api/saude"}]' ESPERA_MS=1000 node vigia.mjs`

Sem as variáveis do Telegram, o aviso só aparece no terminal.
