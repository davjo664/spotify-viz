const rootURL = 'http://127.0.0.1:3001';
var auth = {};
var firstDate = new Date('2016-12-29');
var lastDate = new Date('2019-02-28');
var selectedDate = new Date('2019-02-28');
var top200Chart = document.getElementById('top200-chart');
var chartTitle = document.getElementById('chart-title');
var timelineText = document.getElementById('timeline-text');

window.onload = function(){
  getAccessToken();
  setupTimeline();
  setGlobalChart(selectedDate);
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

function setGlobalChart(date){
  setChartTitle('Global');
  clearTop200Chart();

  var endDate = new Date(date);
  // For some reason Spotify's URL for weekly charts is +1 day of the selected date
  endDate.setDate(endDate.getDate() + 1);

  var startDate = new Date(endDate);
  // Subtract 1 week
  startDate.setDate(startDate.getDate() - 7);

  var options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "startDate": startDate.yyyymmdd(),
      "endDate": endDate.yyyymmdd()
    })
  };

  fetch(rootURL + '/get-global-chart', options)
    .then(function(response){
      return response.json();
    })
    .then(function(obj){
      if(Array.isArray(obj) && obj.length == 202){
        if(!countrySelected()){
          setTop200Chart(obj);
        }
      }
      else{
        console.log('No Spotify global chart found on date: ' + date.yyyymmdd());
        alertNoDataFound();
      }
    })
    .catch(function(err){
      console.error(err);
    });
}

function setCountryChart(countryName, date){
  setChartTitle(countryName);
  clearTop200Chart();

  var isoCode = isoCountries[countryName];
  if(isoCode){
    var endDate = new Date(date);
    // For some reason Spotify's URL for weekly charts is +1 day of the selected date
    endDate.setDate(endDate.getDate() + 1);

    var startDate = new Date(endDate);
    // Subtract 1 week
    startDate.setDate(startDate.getDate() - 7);

    var options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "isoCode": isoCode.toLowerCase(),
        "startDate": startDate.yyyymmdd(),
        "endDate": endDate.yyyymmdd()
      })
    };

    fetch(rootURL + '/get-country-chart', options)
      .then(function(response){
        return response.json();
      })
      .then(function(obj){
        if(Array.isArray(obj) && obj.length == 202){
          if(countrySelected()){
            setTop200Chart(obj);
          }
        }
        else{
          console.log('No Spotify data found for ' + countryName + ' on date: ' + date.yyyymmdd());
          alertNoDataFound();
        }
      })
      .catch(function(err){
        console.error(err);
      });
  }
  else{
    console.log('isocode for ' + countryName + ' was not found.');
    alertNoDataFound();
  }
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

Date.prototype.yyyymmdd = function(){
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

function setTop200Chart(data){
  clearTop200Chart();
  for(var i = 2; i < data.length; i++){
    var row = data[i];

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
}

function setChartTitle(str){
  chartTitle.innerHTML = "Weekly Top 200 - " + str;
  chartTitle['data-value'] = str;
}

function alertNoDataFound(){
  clearTop200Chart();
  var li = document.createElement('li');
  li.className = 'list-group-item';
  li.innerHTML = 'No data found.';
  top200Chart.appendChild(li);
}

function setupTimeline(){
  timelineText.innerHTML = formatDate(selectedDate);
  var numberOfWeeks = daysBetween(firstDate, lastDate)/7;

  $("#timeline").slider({
    min: 0,
    max: numberOfWeeks,
    step: 1,
    value: numberOfWeeks,
    slide: function( event, ui ) {
      var date = new Date(firstDate);
      date.setDate(date.getDate() + ui.value*7);
      timelineText.innerHTML = formatDate(date);
    },
    stop: function( event, ui ) {
      var date = new Date(firstDate);
      date.setDate(date.getDate() + ui.value*7);
      timelineText.innerHTML = formatDate(date);
      changeDate(date);
    }
  });
}

function daysBetween(date1, date2){
  var diff = Math.abs(date2.getTime() - date1.getTime());
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function changeDate(date){
  selectedDate = date;
  // Update top200 chart with the new date
  if(countrySelected()){
    setCountryChart(getSelectedCountry(), selectedDate);
  }
  else{
    setGlobalChart(selectedDate);
  }
}

function countrySelected(){
  return (chartTitle['data-value'] !== "Global");
}

function getSelectedCountry(){
  return chartTitle['data-value'];
}

function formatDate(date){
  var yyyy = date.getFullYear();
  var dd = date.getDate();
  dd = (dd > 9 ? '' : '0') + dd;
  var month = date.toLocaleString("en-us", { month: "short" });
  return dd + '-' + month + '-' + yyyy;
}
