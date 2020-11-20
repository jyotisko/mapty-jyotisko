'use strict';

class Workout {
  date = new Date();
  id = +((Date.now() + '').slice(-10));
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lon]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  click() {
    this.clicks++;
  }

  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${this.date.getDate()} ${months[this.date.getMonth()]}`;
  }
}

class Running extends Workout {
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.type = 'Running';
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min / km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.type = 'Cycling';
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km / h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const map = document.querySelector('#map');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const resetBtn = document.querySelector('.reset');
const inputCadence = document.querySelector('.form__input--cadence');
const workoutForm = document.querySelector('.workout');
const fitMarkersBtn = document.querySelector('.fit-all-markers');
const inputElevation = document.querySelector('.form__input--elevation');
const weatherPopupContainer = document.querySelector('.weather-popup');
const closeWeatherPopup = document.querySelector('.close-weather-popup');

//------------
// APPLICATION
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    // Get user's location
    this._getPosition();

    // Marker's array
    this.markers = [];

    // Get data from local storage
    this._getLocalStorage();

    // Set up event handlers
    fitMarkersBtn.addEventListener('click', this._fitAllMarkers.bind(this));
    resetBtn.addEventListener('click', this.reset.bind(this));
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationMap);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
        alert('Unable to fetch your location!');
      });
    }
  }

  _loadMap(position) {
    const latitude = position['coords']['latitude'];
    const longitude = position['coords']['longitude'];
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);
    L.marker(coords).addTo(this.#map).bindPopup('You are here!.').openPopup();
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showWeather() {
    console.log(this);
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => form.style.display = 'grid', 1000);
  }

  _toggleElevationMap() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInput = (...inputs) => {
      const isTrue = inputs.every(input => Number.isFinite(input));
      if (isTrue) return true;
    };
    const allPositive = (...inputs) => {
      const isTrue = inputs.every(input => input > 0);
      if (isTrue) return true;
    };

    e.preventDefault();

    // Get data from forms
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const lat = this.#mapEvent.latlng['lat'];
    const lon = this.#mapEvent.latlng['lng'];
    let workout;

    // if running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (!validInput(cadence, distance, duration) || !allPositive(cadence, distance, duration)) return alert('Inputs have to be positive numbers');
      workout = new Running([lat, lon], distance, duration, cadence);
    }

    // if cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (!validInput(elevation, distance, duration) || !allPositive(elevation, distance, duration)) return alert('Inputs have to be positive numbers');
      workout = new Cycling([lat, lon], distance, duration, elevation);
    }

    this.#workouts.push(workout);

    // Render workout on map as a marker
    this._renderWorkoutMarker(workout);

    // Render workout on map
    this._renderWorkout(workout);

    // Clear input fields + hide form
    this._hideForm();

    // local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const className = `${workout.type[0].toLowerCase()}${workout.type.slice(1)}`;

    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup(
          {
            maxWidth: 250,
            minWidth: 150,
            autoClose: false,
            closeOnClick: false,
            className: `${className}-popup`
          }
        )
          .setContent(`${workout.type == 'Running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description} <br> <div class="leaflet-weather-button-container"><button class="leaflet-weather-button" data-id="${workout.id}">Show weather</button></div>`)
          .setLatLng(workout.coords)
          .openOn(this.#map)
      )
      .openPopup();
    this.markers.push(L.marker(workout.coords));

    // Show weather Setup
    const showWeatherBtn = document.querySelectorAll('.leaflet-weather-button');
    showWeatherBtn.forEach(btn => btn.addEventListener('click', function (e) {
      if (e.target.dataset.id != workout.id) return;

      const city = document.querySelector('.city');
      const lat = document.querySelector('.lat');
      const lon = document.querySelector('.lon');
      const weather = document.querySelector('.main-weather');
      const currentTemp = document.querySelector('.current-temp');
      const feelsLikeTemp = document.querySelector('.feels-like-temp');
      const minTemp = document.querySelector('.min-temp');
      const maxTemp = document.querySelector('.max-temp');
      const windSpeed = document.querySelector('.wind-speed');

      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${workout.coords[0]}&lon=${workout.coords[1]}&appid=f3ea383f3b338f515f35d8754f6e7c93&units=metric`)
        .then(response => response.json())
        .then(
          weatherData => {

            if (weatherData.cod !== 200) throw new Error(`Unable to get the weather at this place! \nMessage: ${weatherData.message}`);

            console.log(weatherData);
            const data = {
              cod: weatherData.cod,
              city: weatherData.name,
              lat: weatherData.coord.lat,
              lon: weatherData.coord.lon,
              weather: weatherData.weather[0].main,
              weatherIcon: weatherData.weather[0].icon,
              currentTemp: weatherData.main.temp,
              feelsLikeTemp: weatherData.main.feels_like,
              minTemp: weatherData.main.temp_min,
              maxTemp: weatherData.main.temp_max,
              windSpeed: weatherData.wind.speed
            };

            map.style.zIndex = '-1';
            weatherPopupContainer.style.display = 'flex';

            city.textContent = data.city;
            lat.textContent = data.lat;
            lon.textContent = data.lon;
            weather.textContent = data.weather;
            currentTemp.textContent = `${data.currentTemp} °C`;
            feelsLikeTemp.textContent = `${data.feelsLikeTemp} °C`;
            minTemp.textContent = `${data.minTemp} °C`;
            maxTemp.textContent = `${data.maxTemp} °C`;
            windSpeed.textContent = `${data.windSpeed} km/h`;

            closeWeatherPopup.addEventListener('click', () => {
              map.style.zIndex = '0';
              weatherPopupContainer.style.display = 'none';
            });
          }
        )
        .catch(err => alert(err));
    }));
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${(workout.type).toLowerCase()}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${workout.type == 'Running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;
    if (workout.type.toLowerCase() == 'running') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence.toFixed(1)}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
    `;
    }

    if (workout.type.toLowerCase() == 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevation.toFixed(1)}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
    `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(work => work.id == workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1
      }
    });
  }

  _fitAllMarkers() {
    const group = L.featureGroup(this.markers).addTo(this.#map);
    this.#map.fitBounds(group.getBounds());
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
