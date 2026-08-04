document.addEventListener('DOMContentLoaded', () => {
  const mapEl = document.getElementById('map');
  const locateBtn = document.getElementById('locate-btn');
  const status = document.getElementById('locate-status');
  const latInput = document.getElementById('latitude');
  const lngInput = document.getElementById('longitude');

  if (!mapEl) return;

  const map = L.map('map').setView([0, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  let marker = null;

  function setMarker(lat, lng) {
    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng]).addTo(map);
    }
    map.setView([lat, lng], 15);
    if (latInput) latInput.value = lat;
    if (lngInput) lngInput.value = lng;
  }

  function locate(event) {
    if (event) event.preventDefault();
    if (!navigator.geolocation) {
      status.textContent = 'Géolocalisation non supportée. Ouvrez la page via HTTPS ou localhost.';
      return;
    }
    status.textContent = 'Recherche de position...';
    try {
      navigator.geolocation.getCurrentPosition((p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        setMarker(lat, lng);
        status.textContent = 'Position trouvée';
      }, (err) => {
        var message = err && err.message ? err.message : 'Permission refusée ou fonctionnalité bloquée.';
        if (err && err.code === err.PERMISSION_DENIED) {
          message = 'Accès à la localisation refusé. Autorisez la géolocalisation dans votre navigateur.';
        }
        status.textContent = 'Erreur : ' + message;
      }, { enableHighAccuracy: true, timeout: 10000 });
    } catch (error) {
      status.textContent = 'Erreur : ' + (error.message || 'Impossible de récupérer la position.');
      console.error('Geolocation error:', error);
    }
  }

  if (locateBtn) locateBtn.addEventListener('click', locate);

  map.on('click', function (e) {
    setMarker(e.latlng.lat, e.latlng.lng);
    if (status) status.textContent = 'Position définie manuellement';
  });

  // If inputs already have values, show them on the map
  if (latInput && lngInput && latInput.value && lngInput.value) {
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    if (!isNaN(lat) && !isNaN(lng)) setMarker(lat, lng);
  }
});
