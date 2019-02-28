const rootURL = 'http://127.0.0.1:3001';
var auth = {};
var selectedDate = '2019-02-21';
var top200Chart = document.getElementById('top200-chart');

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
      clearTop200Chart();
      for(var i = 2; i < obj.length; i++){
        var row = obj[i];

        var place = row[0];
        var songName = row[1];
        var artist = row[2];
        var streams = row[3];
        var url = row[4];

        var a = document.createElement('a');
        var placeMod = place + '. ';
        a.innerHTML = placeMod.fontcolor("green").bold() + artist + ' - ' + songName;
        a.className = "list-group-item list-group-item-action";
        a['data-url'] = url;
        a['data-spotifyID'] = last22Characters(url);
        a.addEventListener("click", onSongClick, false);

        var span = document.createElement('span');
        span.className = 'badge badge-secondary badge-pill';
        span.innerHTML = numberWithCommas(streams);
        span.style.float = 'right';
        a.appendChild(span);
        top200Chart.appendChild(a);
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

function clearTop200Chart(){
  while(top200Chart.firstChild){
    top200Chart.removeChild(top200Chart.firstChild);
  }
}

function onSongClick(){
  console.log('onSongClick!');
  console.log('url: ' + this['data-url']);
  console.log('spotifyID: ' + this['data-spotifyID']);
  selectSong(this['data-spotifyID']);
}

function last22Characters(str){
  return str.slice(-22);
}

function selectSong(spotifyID){
  var songs = top200Chart.children;
  for(var i = 0; i < songs.length; i++){
    var song = songs[i];
    if(song['data-spotifyID'] == spotifyID){
      song.style.border = '1px solid green';
      song.style['z-index'] = 2;
    }
    else{
      song.style.border = '1px solid rgba(0,0,0,0.2)';
      song.style['z-index'] = 1;
    }
  }
}
