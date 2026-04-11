import { execFileSync } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let db: PGlite | null = null;
let server: PGLiteSocketServer | null = null;
let pool: Pool | null = null;
let client: PrismaClient | null = null;
let schemaSql: string | null = null;

function getSchemaSql() {
  if (!schemaSql) {
    schemaSql = execFileSync(
      'cmd.exe',
      ['/c', 'npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script'],
      { encoding: 'utf8' }
    )
      .split('\n')
      .filter((line) => !line.startsWith('Loaded Prisma config'))
      .join('\n');
  }

  return schemaSql;
}

export function getTestPrisma(): PrismaClient {
  if (!client) {
    throw new Error('Test Prisma client has not been started.');
  }

  return client;
}

export const testPrisma = new Proxy(
  {},
  {
    get(_target, property, receiver) {
      return Reflect.get(getTestPrisma(), property, receiver);
    },
  }
) as PrismaClient;

export async function startTestDatabase() {
  if (client) return client;

  db = await PGlite.create();
  await db.exec(getSchemaSql());

  server = new PGLiteSocketServer({
    db,
    host: '127.0.0.1',
    port: 0,
    maxConnections: 8,
  });
  await server.start();

  const connectionString = `postgresql://postgres:postgres@${server.getServerConn()}/postgres`;
  pool = new Pool({ connectionString, max: 1 });
  client = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: ['error'],
  });

  return client;
}

export async function resetTestDatabase() {
  const prisma = getTestPrisma();
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `;

  if (tables.length === 0) return;

  const tableList = tables
    .map(({ tablename }) => `"public"."${tablename.replaceAll('"', '""')}"`)
    .join(', ');

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

export async function stopTestDatabase() {
  if (client) {
    await client.$disconnect();
    client = null;
  }

  if (pool) {
    await pool.end();
    pool = null;
  }

  if (server) {
    await server.stop();
    server = null;
  }

  if (db) {
    await db.close();
    db = null;
  }
}
