const https = require('https');

const options = {
  hostname: 'api.football-data.org',
  path: '/v4/competitions/WC/matches',
  method: 'GET',
  headers: {
    'X-Auth-Token': 'a87cbb3a00b8484eb4b0098aa94f6fb6'
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Total matches:', json.matches ? json.matches.length : 'none');
      if (json.matches && json.matches.length > 0) {
        console.log('Sample match:', JSON.stringify(json.matches[0], null, 2));
      } else {
        console.log('Full response:', JSON.stringify(json, null, 2));
      }
    } catch (e) {
      console.error('Error parsing JSON:', data);
    }
  });
});

req.on('error', error => console.error(error));
req.end();
