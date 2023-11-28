var request = require('request-json');
var client = request.createClient('https://www.iberdroladistribucionelectrica.com/consumidores/rest/', { jar: true });

var api;
var iberdrola = function(credentials, callback) {

  api = this;

  this.loggedIn = false;
  this.credentials = {
    email: credentials.email,
    password: credentials.password
  };
  this.cookie = "";

  client.headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Content-Type': 'application/json; charset=UTF-8',
    'dispositivo': 'desktop',
    'Sec-Ch-Ua-Platform': 'Windows',
    'Appversion': 'v2',
    'Language': 'es'
  }

  this.ready = !credentials.contract ? this.login() : new Promise((resolve, reject) => {
    this.login().then(() => {
      this.selectContract(credentials.contract).then(() => {
        resolve()
      }).catch(() => {
        reject('no-contract')
      });
    }).catch(() => {
      reject('no-access')
    });
  });
}

/**
 * Factory
 **/
module.exports.login = function(email, password) {
  return new iberdrola(email, password);
}

/**
 * Login method - login()
 **/
iberdrola.prototype.login = function() {

  return new Promise((resolve, reject) => {

    client.post('loginNew/login', [
      api.credentials.email,
      api.credentials.password,
      null,
      'Windows 10',
      'PC',
      'Chrome 119.0.0.0',
      '0',
      '0',
      's',
      null
    ], (error, response, body) => {
      if (!error && response.statusCode === 200 && body.success.toString() === 'true') {
        api.loggedIn = true;
        api.cookie = "JSESSIONID_WTG=" + response.responseCookies.JSESSIONID_WTG.value;
        resolve();
      } else reject();
    });
  });
}

/**
 * Get Contracts Method - getContracts()
 **/
iberdrola.prototype.getContracts = function() {

  return new Promise((resolve, reject) => {
    
    client.headers = {
      'Cookie': api.cookie
    }

    client.get('cto/listaCtos/', (error, response, body) => {
      if (!error && response.statusCode === 200 && body.success.toString() === 'true') {
        resolve(body['contratos']);
      } else {
        console.debug({
          error: error,
          response: response,
          body: body
        });
        reject('no-access');
      }
    });
  });
}

/**
 * Select Contract Method - selectContract(contract)
 **/
iberdrola.prototype.selectContract = function(contract) {

  return new Promise((resolve, reject) => {

    client.headers = {
      'Cookie': api.cookie
    }

    client.get('cto/seleccion/' + contract, (error, response, body) => {

      if (!error && response.statusCode === 200 && body.success.toString() === 'true') resolve();
      else {
        console.debug({
          error: error,
          response: response,
          body: body
        });
        reject();
      }
    });
  });
}

/**
 * Get Reading Method - getReading()
 **/
iberdrola.prototype.getReading = function() {

  return new Promise((resolve, reject) => {
    
    client.headers = {
      'Cookie': api.cookie
    }

    client.get('escenarioNew/obtenerMedicionOnline/12', (error, response, body) => {

      if (!error && response.statusCode === 200) {
        resolve({
          hour: (new Date()).getHours(),
          consumption: body && body.valMagnitud ? parseFloat(body.valMagnitud) : null
        });
      } else {
        console.debug({
          error: error,
          response: response,
          body: body
        });
        reject();
      }
    });
  });
}

/**
 * Get Date Limits Method - getDateLimits()
 **/
iberdrola.prototype.getDateLimits = function() {
    
  return new Promise((resolve, reject) => {
    
    client.headers = {
      'Cookie': api.cookie
    }

    client.get('consumoNew/obtenerLimiteFechasConsumo', (error, response, body) => {

      if (!error && response.statusCode === 200) {
        resolve({
          min: new Date(body.fechaMinima.substring(0, 10).split('-').reverse().join('-')),
          max: new Date(body.fechaMaxima.substring(0, 10).split('-').reverse().join('-'))
        });
      } else {
        console.debug({
          error: error,
          response: response,
          body: body
        });
        reject();
      }
    });
  });
}

/**
 * Get Reading Method - getReadingsOfDay(date)
 **/
iberdrola.prototype.getReadingsOfDay = function(date) {

  return new Promise((resolve, reject) => {
    
    client.headers = {
      'Cookie': api.cookie
    }

    const day = (new Date(date)).toISOString().substring(0, 10).split('-').reverse().join('-').concat('00:00:00');

    client.get('consumoNew/obtenerDatosConsumoDH/' + day + "/" + day + '/horas/USU/', (error, response, body) => {
      if (!error && response.statusCode === 200) {

        const data = body.y.data[0] || [];
        resolve(data.map((entry, index) => {
          return {
            hour: index,
            consumption: entry ? parseFloat(entry.valor) : null
          }
        }));
      } else {
        console.debug({
          error: error,
          response: response,
          body: body
        });
        reject();
      }
    });
  });
}

/**
 * Get Exports Method - getExportsOfDay(date)
 **/
iberdrola.prototype.getExportsOfDay = function(date) {

  return new Promise((resolve, reject) => {

    const day = (new Date(date)).toISOString().substring(0, 10).split('-').reverse().join('-').concat('00:00:00');

    client.headers = {
      'Cookie': api.cookie
    }

    client.get('consumoNew/obtenerDatosProduccionDH/' + day +  "/" + day + '/horas/', (error, response, body) => {
      if (!error && response.statusCode === 200) {

        const data = body.y.data[0] || [];
        resolve(data.map((entry, index) => {
          return {
            hour: index,
            consumption: entry ? parseFloat(entry.valor) : null
          }
        }));
      } else {
        console.debug({
          error: error,
          response: response,
          body: body
        });
        reject();
      }
    });
  });
}
