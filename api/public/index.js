const rootURL = 'http://127.0.0.1:3000';
var auth = {};
var selectedDate = '2019-02-21';
var globalChart = document.getElementById('global-chart');
var countryChart = document.getElementById('country-chart');

window.onload = function(){
  getAccessToken();
  setGlobalChart(selectedDate);
  //setCountryChart('cl', selectedDate)
}

function getAccessToken(){
  var url = rootURL + '/get-access-token';

  fetch(url)
   .then(function(response){
     return response.json();
   })
   .then(function(obj){
     // Save the token.
     auth = obj;
     // Should be on the form {"access_token":..., "token_type":..., "expires_in":..., "scope":...}
     // "expires_in" will be a number of seconds.
   })
   .then(function(){
     // Update token when it expires
     setTimeout(function(){ getAccessToken(); }, auth.expires_in*1000); // Convert to milliseconds
   })
   .catch(function(err){
     console.error(err);
   });
}

function setGlobalChart(selectedDate){
  var endDateObj = new Date(selectedDate);
  // For some reason Spotify's URL for weekly charts is +1 day of the selected date
  endDateObj.setDate(endDateObj.getDate() + 1);
  // Convert to YYYY-MM-DD
  var endDate = endDateObj.YYYYMMDD();

  var startDateObj = new Date(endDate);
  // Subtract 1 week
  startDateObj.setDate(startDateObj.getDate() - 7);
  // Convert to YYYY-MM-DD
  var startDate = startDateObj.YYYYMMDD();

  var options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "startDate": startDate,
      "endDate": endDate
    })
  };

  fetch(rootURL + '/get-global-chart', options)
    .then(function(response){
      return response.json();
    })
    .then(function(obj){
      for(var i = 2; i < obj.length; i++){
        var a = document.createElement('a');
        a.innerHTML = obj[i];
        a.href = "#";
        a.className = "list-group-item list-group-item-action";
        var span = document.createElement('span');
        span.className = 'badge badge-secondary badge-pill';
        span.innerHTML = numberWithCommas(obj[i][3]);
        span.style.float = 'right';
        a.appendChild(span);
        globalChart.appendChild(a);
      }
    })
    .catch(function(err){
      console.error(err);
    });
}

function setCountryChart(countryID, selectedDate){
  var endDateObj = new Date(selectedDate);
  // For some reason Spotify's URL for weekly charts is +1 day of the selected date
  endDateObj.setDate(endDateObj.getDate() + 1);
  // Convert to YYYY-MM-DD
  var endDate = endDateObj.YYYYMMDD();

  var startDateObj = new Date(endDate);
  // Subtract 1 week
  startDateObj.setDate(startDateObj.getDate() - 7);
  // Convert to YYYY-MM-DD
  var startDate = startDateObj.YYYYMMDD();

  var options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "countryID": countryID,
      "startDate": startDate,
      "endDate": endDate
    })
  };

  fetch(rootURL + '/get-country-chart', options)
    .then(function(response){
      return response.json();
    })
    .then(function(obj){
      for(var i = 2; i < obj.length; i++){
        var a = document.createElement('a');
        a.innerHTML = obj[i];
        a.href = "#";
        a.className = "list-group-item list-group-item-action";
        countryChart.appendChild(a);
      }
    })
    .catch(function(err){
      console.error(err);
    });
}

function hej(){
  var options = {
    method: "GET",
    headers: {
      "Authorization": auth.token_type + " " + auth.access_token
    }
  };

  fetch('https://api.spotify.com/v1/audio-features/' + '06AKEBrKUckW0KREUWRnvT', options)
    .then(function(response){
      console.log(response);
      return response.json();
    })
    .then(function(obj){
      console.log(JSON.stringify(obj));
    });
}

Date.prototype.YYYYMMDD = function(){
  var mm = this.getMonth() + 1;
  var dd = this.getDate();
  return [this.getFullYear(), (mm > 9 ? '' : '0') + mm, (dd > 9 ? '' : '0') + dd].join('-');
};

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
