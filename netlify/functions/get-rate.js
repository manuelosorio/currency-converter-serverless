const fetch = require('node-fetch');

const API_KEY = process.env.API_KEY;

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
      return fetch(`https://exchange-rates.abstractapi.com/v1/live/?api_key=${API_KEY}&base=${base}&target=${target}`, {
        method: 'GET'
      }).catch((err) => {
        console.error(err);
        return {
          statusCode: 400,
          body: "Something went wrong"
        };
      }).then(async (res) => {
        /**
         *
         * @type { CurrencyDataType }
         */
        const data = await res.json();
        console.log(data);
        return {
          statusCode: 200,
          body: JSON.stringify(data.exchange_rates[target])
        };
      });
    } catch (e) {
      console.error(e.message)
    }

}


