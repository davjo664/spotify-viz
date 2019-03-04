import { scene, camera, renderer, canvas } from './common/scene';
import { setEvents } from './common/setEvents';
import { convertToXYZ, getEventCenter, geodecoder } from './common/geoHelpers';
import { mapTexture } from './common/mapTexture';
import { getTween, memoize } from './common/utils';
import { feature as topojsonFeature } from 'topojson';
// import THREE from 'THREE';
import d3 from 'd3';

var controls;
var prevRotation;
var geo;
var root;
var overlay;
var textureCache;
var selectedCountry = null;
var parallelCoordsVisible = false;

const searchField = document.querySelector('#search');
const ul = document.querySelector('#results');

const typeHandler = function(e) {
  //console.log(e.target.value)
  ul.innerHTML = '';
  for (var key in geo.getStore()) {
      if (key.toLowerCase().startsWith(e.target.value.toLowerCase())) {
        // console.log(key);
        var li = document.createElement("li");

        var btn = document.createElement("BUTTON");
        btn.addEventListener('click', function() {
          //console.log("CLICK");
          //console.log(this.textContent);
          var country = geo.find(this.textContent);
          //console.log(country);
          //console.log(country.geometry.coordinates[0][0]);
          if(country.id !== selectedCountry){
            selectedCountry = country.id;
            if (Array.isArray(country.geometry.coordinates[0][0][0])) {
              goto(country.geometry.coordinates[0][0][0], country.id);
            } else {
              goto(country.geometry.coordinates[0][0], country.id);
            }
          }
        });
        var t = document.createTextNode(key);
        btn.appendChild(t);
        li.appendChild(btn);
        ul.appendChild(li);

      }
  }
}

searchField.addEventListener('input', typeHandler) // register for oninput

d3.json('data/world.json', function (err, data) {

  d3.select("#loading").transition().duration(500)
    .style("opacity", 0).remove();

  var currentCountry, overlay;

  var segments = 155; // number of vertices. Higher = better mouse accuracy

  // Setup cache for country textures
  var countries = topojsonFeature(data, data.objects.countries);
  geo = geodecoder(countries.features);

  textureCache = memoize(function (cntryID, color) {
    var country = geo.find(cntryID);
    return mapTexture(country, color);
  });

  // Base globe with blue "water"
  let blueMaterial = new THREE.MeshPhongMaterial({color: '#191414', transparent: true});
  let sphere = new THREE.SphereGeometry(200, segments, segments);
  let baseGlobe = new THREE.Mesh(sphere, blueMaterial);
  baseGlobe.rotation.y = Math.PI;
  baseGlobe.addEventListener('click', onGlobeClick);
  baseGlobe.addEventListener('mousemove', onGlobeMousemove);

  // add base map layer with all countries
  let worldTexture = mapTexture(countries, '#1db954');
  let mapMaterial  = new THREE.MeshPhongMaterial({map: worldTexture, transparent: true});
  var baseMap = new THREE.Mesh(new THREE.SphereGeometry(200, segments, segments), mapMaterial);
  baseMap.rotation.y = Math.PI;

  // HEADMAP attempt

  // console.log("store");
  // // console.log(geo.getStore());
  // var overlayall = new THREE.Object3D();
  // var position = new THREE.Vector2(0,0);
  // var map;
  // for (var key in geo.getStore()) {
  //       // Overlay the selected country
  //       if (map) {
  //         console.log("copy")
  //         renderer.copyTextureToTexture( position, map, textureCache(key, 'red' ));
  //       } else {
  //         console.log("create");
  //         map = textureCache(key, 'red');
  //       }
  //       // root.add(overlay);
  // }

  // var material = new THREE.MeshPhongMaterial({map: map, transparent: false});
  // var overlay = new THREE.Mesh(new THREE.SphereGeometry(201, 40, 40), material);
  // overlay.rotation.y = Math.PI;
  // root.add(overlay);


  // create a container node and add the two meshes
  root = new THREE.Object3D();
  root.scale.set(2.5, 2.5, 2.5);
  root.add(baseGlobe);
  root.add(baseMap);
  scene.add(root);

  // controls
  controls = new THREE.OrbitControls( camera, renderer.domElement );
  controls.enableKeys = false;

  function onGlobeClick(event, pos) {
    //console.log("onGlobeClick");
    if (parallelCoordsVisible) {
      return;
    }
    if (controls.getRotated()) {
      //console.log("rotated")
      return;
    }

    var latlng = getEventCenter.call(this, event);
    var country = geo.search(latlng[0], latlng[1]);

    if (country !== null) {
      showParallelCoords();
      console.log('country clicked! code: ' + country.code);
      //console.log('country: ' + JSON.stringify(country));
      var countryData = geo.find(country.code);
      //console.log(countryData.geometry.coordinates[0][0]);
      if(countryData.id == selectedCountry){
        //console.log('already selected');
        selectedCountry = null;
        clearOverlay();
        setGlobalChart(selectedDate);
      }
      else{
        selectedCountry = countryData.id;
        if (Array.isArray(countryData.geometry.coordinates[0][0][0])) {
          goto(countryData.geometry.coordinates[0][0][0], countryData.id);
        } else {
          goto(countryData.geometry.coordinates[0][0], countryData.id);
        }
      }
    }
    else{
      return;
      //console.log('no country here');
      // Get new camera position
      // var temp = new THREE.Mesh();
      // temp.position.copy(convertToXYZ(latlng, 900));
      // temp.lookAt(root.position);
      // temp.rotateY(Math.PI);

      // for (let key in temp.rotation) {
      //   if (temp.rotation[key] - camera.rotation[key] > Math.PI) {
      //     temp.rotation[key] -= Math.PI * 2;
      //   } else if (camera.rotation[key] - temp.rotation[key] > Math.PI) {
      //     temp.rotation[key] += Math.PI * 2;
      //   }
      // }

      // var tweenPos = getTween.call(camera, 'position', temp.position);
      // d3.timer(tweenPos);

      // var tweenRot = getTween.call(camera, 'rotation', temp.rotation);
      // d3.timer(tweenRot);
    }

  }

  function onGlobeMousemove(event) {

    if (parallelCoordsVisible) {
      return;
    }
    
    var map, material;

    // Get pointc, convert to latitude/longitude
    var latlng = getEventCenter.call(this, event);

    // Look for country at that latitude/longitude
    var country = geo.search(latlng[0], latlng[1]);

    if (country !== null && country.code !== currentCountry) {

      // Track the current country displayed
      currentCountry = country.code;

      // Update the html
      d3.select("#msg").html(country.code);

       // Overlay the selected country
      map = textureCache(country.code, '#CDC290');
      material = new THREE.MeshPhongMaterial({map: map, transparent: true});
      if (!overlay) {
        overlay = new THREE.Mesh(new THREE.SphereGeometry(201, 40, 40), material);
        overlay.rotation.y = Math.PI;
        root.add(overlay);
      } else {
        overlay.material = material;
      }
    }
  }

  setEvents(camera, [baseGlobe], 'click');
  setEvents(camera, [baseGlobe], 'mousemove', 10);
});

function goto(pos, code) {
  //console.log('goto ' + code);

  // Update the top200-chart
  setCountryChart(code, selectedDate);

  if (controls.getRotated()) {
    console.log("rotated")
    return;
  }

  var latlng = [pos[1],pos[0]];
  // Get pointc, convert to latitude/longitude

  // Get new camera position
  var temp = new THREE.Mesh();
  temp.position.copy(convertToXYZ(latlng, 900));
  temp.lookAt(root.position);
  temp.rotateY(Math.PI);

   // Overlay the selected country
   var map = textureCache(code, 'red');
   var material = new THREE.MeshPhongMaterial({map: map, transparent: true});
   if (!overlay) {
     overlay = new THREE.Mesh(new THREE.SphereGeometry(201, 40, 40), material);
     overlay.rotation.y = Math.PI;
     root.add(overlay);
   } else {
     overlay.material = material;
   }

  for (let key in temp.rotation) {
    if (temp.rotation[key] - camera.rotation[key] > Math.PI) {
      temp.rotation[key] -= Math.PI * 2;
    } else if (camera.rotation[key] - temp.rotation[key] > Math.PI) {
      temp.rotation[key] += Math.PI * 2;
    }
  }

  var tweenPos = getTween.call(camera, 'position', temp.position);
  d3.timer(tweenPos);

  var tweenRot = getTween.call(camera, 'rotation', temp.rotation);
  d3.timer(tweenRot);
}

function animate() {
  requestAnimationFrame(animate);
  // controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
  renderer.render(scene, camera);
}
animate();

function clearOverlay(){
  root.remove(overlay);
  overlay = null;
}

function createParallelCoords() {
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
    var graphContainer = document.getElementById("graph-container");
    var graphheader = document.getElementById("graph-header");
    console.log(event.target)
    if (parallelCoordsVisible && (event.target === canvas[0][0] || event.target === graphheader)) {
      hideParallelCoords();
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
  d3.csv("data/cars.csv", function(error, cars) {

    // Extract the list of dimensions and create a scale for each.
    x.domain(dimensions = d3.keys(cars[0]).filter(function(d) {
      return d != "name" && (y[d] = d3.scale.linear()
          .domain(d3.extent(cars, function(p) { return +p[d]; }))
          .range([height, 0]));
    }));

    // Add grey background lines for context.
    background = svg.append("g")
        .attr("class", "background")
      .selectAll("path")
        .data(cars)
      .enter().append("path")
        .attr("d", path);

    // Add blue foreground lines for focus.
    foreground = svg.append("g")
        .attr("class", "foreground")
      .selectAll("path")
        .data(cars)
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
  });

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

function showParallelCoords() {
  var graphContainer = document.getElementById("graph-container");
  graphContainer.style.height = window.innerHeight*0.49+40 + "px";
  createParallelCoords();
  setTimeout(() => {
    parallelCoordsVisible = true;
  }, 500);
}

function hideParallelCoords() {
  var graphContainer = document.getElementById("graph-container");
  graphContainer.style.height = "40px";
  setTimeout(() => {
    while (graphContainer.children.length > 1) {
      graphContainer.removeChild(graphContainer.lastChild);
    }
    parallelCoordsVisible = false;
  }, 500);
}
