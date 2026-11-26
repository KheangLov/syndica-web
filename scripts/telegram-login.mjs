#!/usr/bin/env node
// One-time setup: log in to your Telegram account and print a session string for CI.
// Run it yourself, on your own computer:
//
//   TELEGRAM_API_ID=123 TELEGRAM_API_HASH=abc node scripts/telegram-login.mjs
//
// Get API_ID / API_HASH at https://my.telegram.org → API development tools.
// Save the printed string as the GitHub secret TELEGRAM_SESSION. Treat it like a password:
// it gives full access to the account. A secondary account is a good idea.

import readline from 'node:readline/promises'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'

const { TELEGRAM_API_ID, TELEGRAM_API_HASH } = process.env
if (!TELEGRAM_API_ID || !TELEGRAM_API_HASH) {
  console.error('Set TELEGRAM_API_ID and TELEGRAM_API_HASH (from https://my.telegram.org) first.')
  process.exit(1)
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const client = new TelegramClient(new StringSession(''), Number(TELEGRAM_API_ID), TELEGRAM_API_HASH, { connectionRetries: 3 })
client.setLogLevel('error')
await client.start({
  phoneNumber: () => rl.question('Phone number (international format): '),
  phoneCode: () => rl.question('Login code sent by Telegram: '),
  password: () => rl.question('Two-step verification password (if set): '),
  onError: (e) => console.error(e.message),
})
console.log('\nTELEGRAM_SESSION (save as a GitHub secret, keep it private):\n')
console.log(client.session.save())
rl.close()
await client.disconnect()
process.exit(0)
