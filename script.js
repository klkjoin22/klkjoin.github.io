const imageWidth = 4000;
const imageHeight = 4000;
const imageUrl = "gta-v-map.png";

const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 2
});

const bounds = [[0, 0], [imageHeight, imageWidth]];
L.imageOverlay(imageUrl, bounds).addTo(map);
map.fitBounds(bounds);

let places = [];
let markersById = {};

const icons = {
  shop: L.icon({
    iconUrl: "icons/shop.png",
    iconSize: [24, 24],
    iconAnchor: [12, 24]
  }),
  garage: L.icon({
    iconUrl: "icons/garage.png",
    iconSize: [24, 24],
    iconAnchor: [12, 24]
  }),
  rp: L.icon({
    iconUrl: "icons/rp.png",
    iconSize: [24, 24],
    iconAnchor: [12, 24]
  }),
  default: L.icon({
    iconUrl: "icons/default.png",
    iconSize: [24, 24],
    iconAnchor: [12, 24]
  })
};

const placeListEl = document.getElementById("place-list");

map.on("click", (e) => {
  const latlng = e.latlng;

  const popupContent = `
    <label>Név:</label>
    <input id="place-name" type="text" placeholder="Hely neve">

    <label>Leírás:</label>
    <textarea id="place-desc" placeholder="Rövid leírás"></textarea>

    <label>Típus:</label>
    <select id="place-type">
      <option value="shop">Bolt</option>
      <option value="garage">Garázs</option>
      <option value="rp">RP hely</option>
    </select>

    <button id="save-place">Mentés</button>
  `;

  const tempMarker = L.marker(latlng, { draggable: true, icon: icons.default })
    .addTo(map)
    .bindPopup(popupContent)
    .openPopup();

  tempMarker.on("popupopen", () => {
    document.getElementById("save-place").onclick = () => {
      const name = document.getElementById("place-name").value || "Névtelen hely";
      const desc = document.getElementById("place-desc").value || "";
      const type = document.getElementById("place-type").value;

      const pos = tempMarker.getLatLng();
      const id = Date.now() + "_" + Math.random().toString(16).slice(2);

      const place = { id, name, desc, type, x: pos.lng, y: pos.lat };
      places.push(place);

      map.removeLayer(tempMarker);
      addPlaceMarker(place);
      renderPlaceList();
    };
  });
});

function addPlaceMarker(place) {
  const icon = icons[place.type] || icons.default;

  const marker = L.marker([place.y, place.x], { draggable: true, icon })
    .addTo(map)
    .bindPopup(`<b>${place.name}</b><br>${place.desc}`);

  marker.on("dragend", () => {
    const pos = marker.getLatLng();
    place.x = pos.lng;
    place.y = pos.lat;
  });

  markersById[place.id] = marker;
}

function renderPlaceList() {
  placeListEl.innerHTML = "";

  const activeTypes = getActiveTypes();

  places
    .filter(p => activeTypes.has(p.type))
    .forEach(place => {
      const li = document.createElement("li");
      li.textContent = `[${place.type}] ${place.name}`;
      li.onclick = () => {
        const marker = markersById[place.id];
        if (marker) {
          map.setView(marker.getLatLng(), 0);
          marker.openPopup();
        }
      };
      placeListEl.appendChild(li);
    });

  places.forEach(place => {
    const marker = markersById[place.id];
    if (!marker) return;
    if (activeTypes.has(place.type)) {
      marker.addTo(map);
    } else {
      map.removeLayer(marker);
    }
  });
}

function getActiveTypes() {
  const checkboxes = document.querySelectorAll("#filters input[type=checkbox]");
  const active = new Set();
  let allChecked = false;

  checkboxes.forEach(cb => {
    const type = cb.getAttribute("data-type");
    if (type === "all" && cb.checked) {
      allChecked = true;
    }
  });

  if (allChecked) {
    active.add("shop");
    active.add("garage");
    active.add("rp");
    return active;
  }

  checkboxes.forEach(cb => {
    const type = cb.getAttribute("data-type");
    if (type !== "all" && cb.checked) {
      active.add(type);
    }
  });

  return active;
}

document.querySelectorAll("#filters input[type=checkbox]").forEach(cb => {
  cb.addEventListener("change", renderPlaceList);
});

document.getElementById("save-json").onclick = () => {
  const data = JSON.stringify(places, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "places.json";
  a.click();

  URL.revokeObjectURL(url);
};

document.getElementById("load-json").onchange = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      places = data;
      markersById = {};

      map.eachLayer(layer => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
      });

      places.forEach(addPlaceMarker);
      renderPlaceList();
    } catch (err) {
      alert("Hibás JSON fájl.");
    }
  };

  reader.readAsText(file);
};
