import { scene, camera, renderer } from './common/scene';
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

    if (controls.getRotated()) {
      //console.log("rotated")
      return;
    }

    var latlng = getEventCenter.call(this, event);
    var country = geo.search(latlng[0], latlng[1]);

    if (country !== null) {
      //console.log('country clicked! code: ' + country.code);
      //console.log('country: ' + JSON.stringify(country));
      var countryData = geo.find(country.code);
      //console.log(countryData.geometry.coordinates[0][0]);
      if(countryData.id == selectedCountry){
        //console.log('already selected');
        selectedCountry = null;
        clearOverlay();
        setChartTitle('Top 200 - Global');
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
      //console.log('no country here');
      // Get new camera position
      var temp = new THREE.Mesh();
      temp.position.copy(convertToXYZ(latlng, 900));
      temp.lookAt(root.position);
      temp.rotateY(Math.PI);

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

  }

  function onGlobeMousemove(event) {
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
  setChartTitle('Top 200 - ' + code);
  var isoCode = isoCountries[code];
  if(isoCode){
    setCountryChart(isoCode.toLowerCase(), selectedDate);
  }
  else{
    console.log('isocode for ' + code + ' was not found.');
    alertNoDataFound();
  }

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
