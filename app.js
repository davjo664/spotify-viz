const express = require('express');
const fetch = require('node-fetch');
const btoa = require('btoa');
const csv = require('csvtojson');
const bodyParser = require('body-parser');

var client_id = '908fe46e46af4fd5a80f5751da42a56c';
var client_secret = '24ceebd0b53a4b1f86d229b53789a399';
var client_auth = btoa(client_id + ':' + client_secret); // Converts to Base64

console.log('Starting server');

const app = express();
const port = 3000;

app.listen(port, () => console.log('App listening on port ' + port));

app.use(express.static('public'));
app.use(bodyParser.json());

app.get('/get-access-token', function(req, res){
  console.log('Incoming request @ /get-access-token');

  var options = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + client_auth
    },
    body: "grant_type=client_credentials"
  };

  var url = 'https://accounts.spotify.com/api/token';
  console.log('Fetching ' + url);
  fetch(url, options)
    .then(function(response) {
      return response.json();
    })
    .then(function(obj) {
      //console.log("Response: " + JSON.stringify(obj));
      res.json(obj);
    })
    .catch(function(err){
      console.error(err);
    });
});

app.post('/get-global-chart', function(req, res){
  console.log('Incoming request @ /get-global-chart');
  var startDate = req.body.startDate;
  var endDate = req.body.endDate;
  var url = 'https://spotifycharts.com/regional/global/weekly/' + startDate + '--' + endDate + '/download';
  console.log('Fetching ' + url);
  fetchTextAsync(url)
    .then(function(csvStr){
      //console.log(csvStr);
      csv({
        noheader:true,
        output: "csv"
      })
      .fromString(csvStr)
      .then((csvRow)=>{
        //console.log(csvRow) // => [["1","2","3"], ["4","5","6"], ["7","8","9"]]
        res.json(csvRow);
      });
    })
    .catch(function(err){
      console.error(err);
    });
});

app.post('/get-country-chart', function(req, res){
  console.log('Incoming request @ /get-country-chart');
  var countryID = req.body.countryID;
  var startDate = req.body.startDate;
  var endDate = req.body.endDate;
  var url = 'https://spotifycharts.com/regional/' + countryID + '/weekly/' + startDate + '--' + endDate + '/download';
  console.log('Fetching ' + url);
  fetchTextAsync(url)
    .then(function(csvStr){
      //console.log(csvStr);
      csv({
        noheader:true,
        output: "csv"
      })
      .fromString(csvStr)
      .then((csvRow)=>{
        //console.log(csvRow) // => [["1","2","3"], ["4","5","6"], ["7","8","9"]]
        res.json(csvRow);
      });
    })
    .catch(function(err){
      console.error(err);
    });
});

async function fetchTextAsync(url){
  var response = await fetch(url);
  var text = await response.text();
  return text;
}
