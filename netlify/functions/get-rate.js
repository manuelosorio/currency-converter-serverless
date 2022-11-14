const fetch = require('node-fetch');
const redis = require('redis');


const API_KEY = process.env.API_KEY;
const CACHE_DURATION = process.env.CACHE_DURATION ?? 60 * 15;
console.log(CACHE_DURATION)// in seconds

const redisConfig = {
  url: process.env.REDIS_URL,
  database: Number(process.env.REDIS_DATABASE),
  password: process.env.REDIS_PASSWORD,
  username: process.env.REDIS_USERNAME
}


const client = redis.createClient(redisConfig);
client.connect();

/**
 *
 * @param event {HandlerEvent}
 * @param _context {HandlerContext}
 * @returns {Promise<HandlerResponse>}
 */
exports.handler = async (event, _context) => {
    try {
      let {base, target} = event.queryStringParameters;
      base = !!base ? base : "USD";
      const key = `${base}-${target}`;
      try {
        /**
         *
         * @type {RedisClientType<RedisDefaultModules & RedisModules, RedisFunctions, RedisScripts>}
         */
        const redisCache = await client.get(key);
        if (await redisCache) {
          return {
            statusCode: 200,
            body: redisCache
          }
        }
      } catch (e) {
        console.error(e);
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
        client.set(key, exchangeRateStr, {
          EX: CACHE_DURATION,
          NX: true
        })
        return {
          statusCode: 200,
          body: exchangeRateStr
        };
      });
    } catch (e) {
      console.error(e.message)
      return {
        statusCode: 400,
        body: JSON.stringify({
          errorMessage: e.message
        })
      }
    }

}


