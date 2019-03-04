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
      "startDate": startDate.YYYYMMDD(),
      "endDate": endDate.YYYYMMDD()
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
        console.log('No Spotify global chart found on date: ' + date.YYYYMMDD());
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
        "startDate": startDate.YYYYMMDD(),
        "endDate": endDate.YYYYMMDD()
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

function getAudioFeaturesTop100(idArray) {
  var options = {
    method: "GET",
    headers: {
      "Authorization": auth.token_type + " " + auth.access_token
    }
  };

  var idString = "";
  for(var i = 0; i < idArray.length; i++) {
    if (i != 0) {
      idString += ","
    }
    idString += idArray[i]
  }

  fetch('https://api.spotify.com/v1/audio-features/?ids=' + idString, options)
    .then(function(response){
      console.log(response);
      return response.json();
    })
    .then(function(obj){
      // console.log(JSON.stringify(obj));
      console.log(obj);
      showParallelCoords(obj.audio_features);
      
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

function setTop200Chart(data){
  var spotifyIDArray = [];
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

    if(spotifyIDArray.length < 100) {
      spotifyIDArray.push(a['data-spotifyID']);
    }
  }
  getAudioFeaturesTop100(spotifyIDArray);
}

function setChartTitle(str){
  chartTitle.innerHTML = "Weekly Top 200 - " + str;
  chartTitle['data-value'] = str;
}

function alertNoDataFound(){
  clearTop200Chart();
  showParallelCoords([]);
  var li = document.createElement('li');
  li.className = 'list-group-item';
  li.innerHTML = 'No data found.';
  top200Chart.appendChild(li);
}

var parallelCoordsVisible = false;
function createParallelCoords(json) {
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
    var graphContainer = document.getElementById("graph-container");
    var graphheader = document.getElementById("graph-header");
    console.log(event.target.tagName)
    if (parallelCoordsVisible && event.target === graphheader) {
      hideParallelCoords();
    } else if (!parallelCoordsVisible && event.target === graphheader) {
      showParallelCoords();
    }
  }
  var margin = {top: 30, right: 10, bottom: 10, left: 10},
    width = window.innerWidth*0.6,
    height = window.innerHeight*0.38;

  var x = d3.scale.ordinal().rangePoints([0, width], 1),
      y = {},
      dragging = {};

  var line = d3.svg.line(),
      axis = d3.svg.axis().orient("left"),
      background,
      foreground;

  var svg = d3.select("#graph-container").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  var dimensions = ["name","economy","cylinders","displacement","power","weight","mph","year"];
    // Extract the list of dimensions and create a scale for each.
    x.domain(dimensions = d3.keys(json[0]).filter(function(d) {
      return (d != "name" && d!= "analysis_url" && d!= "id" && d!= "track_href" && d!= "type" && d!= "uri" && d!= "key" && d!= "time_signature" && d!= "mode") 
      && (y[d] = d3.scale.linear()
          .domain(d3.extent(json, function(p) { return +p[d]; }))
          .range([height, 0]));
    }));

    // Add grey background lines for context.
    background = svg.append("g")
        .attr("class", "background")
      .selectAll("path")
        .data(json)
      .enter().append("path")
        .attr("d", path);

    // Add blue foreground lines for focus.
    foreground = svg.append("g")
        .attr("class", "foreground")
      .selectAll("path")
        .data(json)
      .enter().append("path")
        .attr("d", path);

    // Add a group element for each dimension.
    var g = svg.selectAll(".dimension")
        .data(dimensions)
      .enter().append("g")
        .attr("class", "dimension")
        .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
        .call(d3.behavior.drag()
          .origin(function(d) { return {x: x(d)}; })
          .on("dragstart", function(d) {
            dragging[d] = x(d);
            background.attr("visibility", "hidden");
          })
          .on("drag", function(d) {
            dragging[d] = Math.min(width, Math.max(0, d3.event.x));
            foreground.attr("d", path);
            dimensions.sort(function(a, b) { return position(a) - position(b); });
            x.domain(dimensions);
            g.attr("transform", function(d) { return "translate(" + position(d) + ")"; })
          })
          .on("dragend", function(d) {
            delete dragging[d];
            transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
            transition(foreground).attr("d", path);
            background
                .attr("d", path)
              .transition()
                .delay(500)
                .duration(0)
                .attr("visibility", null);
          }));

    // Add an axis and title.
    g.append("g")
        .attr("class", "axis")
        .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
      .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(function(d) { return d; });

    // Add and store a brush for each axis.
    g.append("g")
        .attr("class", "brush")
        .each(function(d) {
          d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brushstart", brushstart).on("brush", brush));
        })
      .selectAll("rect")
        .attr("x", -8)
        .attr("width", 16);

  function position(d) {
    var v = dragging[d];
    return v == null ? x(d) : v;
  }

  function transition(g) {
    return g.transition().duration(500);
  }

  // Returns the path for a given data point.
  function path(d) {
    return line(dimensions.map(function(p) { return [position(p), y[p](d[p])]; }));
  }

  function brushstart() {
    d3.event.sourceEvent.stopPropagation();
  }

  // Handles a brush event, toggling the display of foreground lines.
  function brush() {
    var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
        extents = actives.map(function(p) { return y[p].brush.extent(); });
    foreground.style("display", function(d) {
      return actives.every(function(p, i) {
        return extents[i][0] <= d[p] && d[p] <= extents[i][1];
      }) ? null : "none";
    });
  }
}

var prevJson;
function showParallelCoords(json) {
  var graphContainer = document.getElementById("graph-container");
  if(parallelCoordsVisible) {
    while (graphContainer.children.length > 1) {
      graphContainer.removeChild(graphContainer.lastChild);
    }
  }
  
  graphContainer.style.height = window.innerHeight*0.49+40 + "px";
  if (json) {
    prevJson = json;
    createParallelCoords(json);
  } else {
    createParallelCoords(prevJson);
  }
  setTimeout(() => {
    parallelCoordsVisible = true;
  }, 500);
}

function hideParallelCoords() {
  console.log("hide");
  var graphContainer = document.getElementById("graph-container");
  graphContainer.style.height = "40px";
  setTimeout(() => {
    while (graphContainer.children.length > 1) {
      graphContainer.removeChild(graphContainer.lastChild);
    }
    parallelCoordsVisible = false;
  }, 500);
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
