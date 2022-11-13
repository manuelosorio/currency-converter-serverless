const API_KEY = process.env.API_KEY;

exports.handler = async (event, _context) => {
    const base = event.queryStringParameters.base;
    const target = event.queryStringParameters.target;

  fetch(`https://exchange-rates.abstractapi.com/v1/live/?api_key=${API_KEY}&base=${base}&target=${target}`, {
    method: 'GET'
  }).catch((err) => {
    console.error(err);
    return {
      statusCode: 400,
      body: err.message
    };
  }).then(async (res) => {
    const data = await res.json();
    console.log(data);
    return {
      statusCode: 200,
      body: "Working on it"
    };
  });
}
