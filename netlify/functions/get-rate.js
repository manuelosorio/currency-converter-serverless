const fetch = require('node-fetch');
const redis = require('redis');

const API_KEY = process.env.API_KEY;
const CACHE_DURATION = process.env.CACHE_DURATION ?? 60 * 15; // in seconds

const redisConfig = {
  url: process.env.REDIS_URL,
  database: Number(process.env.REDIS_DATABASE),
  password: process.env.REDIS_PASSWORD,
  username: process.env.REDIS_USERNAME
}

const client = redis.createClient(redisConfig);
client.on("connect", () => {
  console.info("Client Connected");
}).on("end", () => {
  console.info("Client Disconnected");
});

/**
 * Serveless function handler for get-rate.
 * @param event {HandlerEvent}
 * @param _context {HandlerContext}
 * @returns {Promise<HandlerResponse>}
 */
exports.handler = async (event, _context) => {
    client.connect();
    try {
      let {base, target} = event.queryStringParameters;
      base = !!base ? base : "USD";
      const key = `${base}-${target}`;
      try {
        /**
         * Attempts to create access the cache data if it exists
         * @type {RedisClientType<RedisDefaultModules & RedisModules, RedisFunctions, RedisScripts>}
         */
        const redisCache = await client.get(key);
        if (await redisCache) {
          client.disconnect();
          return {
            statusCode: 200,
            body: redisCache
          }
        }
      } catch (err) {
        console.error(err);
        return {
          statusCode: 400,
          body: JSON.stringify({errorMessage: "There was a Redis error"})
        };
      }
      return fetch(`https://exchange-rates.abstractapi.com/v1/live/?api_key=${API_KEY}&base=${base}&target=${target}`, {
        method: 'GET'
      }).catch((err) => {
        console.error(err);
        return {
          statusCode: 400,
          body: JSON.stringify({errorMessage: "Something went wrong"})
        };
      }).then(async (res) => {
        /**
         *
         * @type { CurrencyDataType }
         */
        const data = await res.json();
        /**
         *
         * @type {string}
         */
        const exchangeRateStr = JSON.stringify({rate: data.exchange_rates[target]});
        await client.set(key, exchangeRateStr, {
          EX: CACHE_DURATION,
          NX: true
        }).finally(async () => {
          await client.disconnect();
        });
        return {
          statusCode: 200,
          body: exchangeRateStr
        };
      });
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          errorMessage: err.message
        })
      }
    }
}
