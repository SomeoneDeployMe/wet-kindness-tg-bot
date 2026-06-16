import {createClient, type Client} from '@libsql/client';

const REQUIRED_CONFIG_CODES = ['SYSTEM', 'MID', 'POLL_OPTIONS'] as const;

export type ConfigRow = {
  code: string;
  value: string;
};

export type MemberRow = {
  id: number;
  tg_name: string;
  name: string;
  telegram_user_id: number | null;
  active: number;
  plays: number;
};

let client: Client | null = null;

function getDbPath() {
  return process.env.DB_PATH ?? 'bot.db';
}

export function getClient() {
  if (!client) {
    client = createClient({
      url: `file:${getDbPath()}`,
      syncUrl: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
      syncInterval: 60,
    });
  }

  return client;
}

export async function syncDb() {
  await getClient().sync();
}

export async function loadConfig(): Promise<ConfigRow[]> {
  const result = await getClient().execute('SELECT code, value FROM config');
  const rows = result.rows.map((row) => ({
    code: row.code as string,
    value: row.value as string,
  }));

  for (const code of REQUIRED_CONFIG_CODES) {
    if (!rows.some((row) => row.code === code)) {
      throw new Error(`Required config code not found: ${code}`);
    }
  }

  return rows;
}

export async function loadMembers(): Promise<MemberRow[]> {
  const result = await getClient().execute(
    'SELECT id, tg_name, name, telegram_user_id, active, plays FROM members'
  );

  const rows = result.rows.map((row) => ({
    id: Number(row.id),
    tg_name: row.tg_name as string,
    name: row.name as string,
    telegram_user_id:
      row.telegram_user_id != null ? Number(row.telegram_user_id) : null,
    active: Number(row.active),
    plays: Number(row.plays),
  }));

  if (rows.length === 0) {
    throw new Error('No members found');
  }

  return rows;
}
