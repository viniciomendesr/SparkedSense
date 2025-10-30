import Redis from 'ioredis';

// Declaramos 'redis' no escopo global para persistir a conexão
// entre invocações de funções serverless (especialmente em desenvolvimento).
declare global {
  // A 'var' é usada aqui intencionalmente para criar uma propriedade global.
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

let redis: Redis;

const redisUrl = process.env.UPSTASH_REDIS_URL;

if (!redisUrl) {
  // Lança um erro se a URL do Redis não estiver nas variáveis de ambiente.
  throw new Error("A variável de ambiente REDIS_URL não está definida. Por favor, crie um arquivo .env.local.");
}

if (process.env.NODE_ENV === 'production') {
  // Em produção, é seguro criar uma nova instância.
  redis = new Redis(redisUrl);
} else {
  // Em desenvolvimento, reutilizamos a conexão armazenada no 'globalThis'
  // para evitar que o hot-reloading crie múltiplas conexões.
  if (!global.redis) {
    global.redis = new Redis(redisUrl);
  }
  redis = global.redis;
}

// Opcional: Logs para monitorar o status da conexão (útil para debug)
redis.on('connect', () => {
  console.log('Cliente Redis conectado com sucesso.');
});

redis.on('error', (err) => {
  console.error('Erro na conexão com o Redis:', err);
});

// Exporta a instância única do cliente.
export default redis;
