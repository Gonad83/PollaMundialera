const axios = require('axios');
axios.post('http://localhost:3001/api/auth/login', {
  email: 'gonaraos@gmail.com',
  password: 'PASSWORD_HERE' // We do not know the password, but we can test if the user exists
}).catch(err => {
  console.log(err.response.data);
});
