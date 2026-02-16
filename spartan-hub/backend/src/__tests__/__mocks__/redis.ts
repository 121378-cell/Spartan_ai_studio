// Mock de Redis para tests unitarios
export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  flushall: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  sismember: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  ttl: jest.fn(),
  pttl: jest.fn(),
  keys: jest.fn(),
  ping: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  delete: jest.fn(),
  lpush: jest.fn(),
  rpush: jest.fn(),
  lpop: jest.fn(),
  rpop: jest.fn(),
  lrange: jest.fn(),
  llen: jest.fn(),
  zadd: jest.fn(),
  zrem: jest.fn(),
  zrange: jest.fn(),
  zrevrange: jest.fn(),
  zcard: jest.fn(),
  zscore: jest.fn(),
  zrank: jest.fn(),
  zrevrank: jest.fn(),
  zcount: jest.fn(),
  zremrangebyrank: jest.fn(),
  zremrangebyscore: jest.fn(),
  zrangebyscore: jest.fn(),
  zrevrangebyscore: jest.fn(),
  zunionstore: jest.fn(),
  zinterstore: jest.fn(),
  zlexcount: jest.fn(),
  zrangebylex: jest.fn(),
  zrevrangebylex: jest.fn(),
  zremrangebylex: jest.fn(),
  pfadd: jest.fn(),
  pfcount: jest.fn(),
  pfmerge: jest.fn(),
  geoadd: jest.fn(),
  geodist: jest.fn(),
  geohash: jest.fn(),
  geopos: jest.fn(),
  georadius: jest.fn(),
  georadiusbymember: jest.fn(),
  publish: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  psubscribe: jest.fn(),
  punsubscribe: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
  emit: jest.fn()
};

// Mock de createClient
export const createClient = jest.fn(() => mockRedis);

// Mock de RedisClient
export class RedisClient {
  constructor(options?: Record<string, unknown>) {
    return mockRedis;
  }
}

// Mock de RedisCluster
export class RedisCluster {
  constructor(nodes: Record<string, unknown>[], options?: Record<string, unknown>) {
    return mockRedis;
  }
}

// Mock de Redis
export const Redis = {
  createClient,
  RedisClient,
  RedisCluster
};

export default Redis;