import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as L from 'leaflet';
import { ApiService } from '../Shared/Api/api.service';
import { Router } from '@angular/router';
import * as domtoimage from 'dom-to-image';
declare var Razorpay: any;
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import * as CryptoJS from 'crypto-js';
@Component({
  selector: 'app-users-nocas',
  templateUrl: './users-nocas.component.html',
  styleUrl: './users-nocas.component.scss'
})
export class UsersNOCASComponent implements OnInit {
  [x: string]: any;
  line: any;
  popupContent: any;
  latitudeDMS!: any;
  longitudeDMS!: any;
  lat!: any;
  long!: any;
  updatedDistance!: number;
  TopElevationForm!: FormGroup | any;
  filteredAirports: any[] = [];
  marker!: any;
  selectedAirportName: string = '';
  selectedAirport: any;
  @ViewChild('map') mapElement!: ElementRef;
  marker2!: any;
  airports: any[] = [];
  map: any;
  city: string = "";
  geojsonLayer: any = null;
  selectedAirportIcao: string = '';
  selectedAirportIATA: string = '';
  airportCoordinates: [number, number] = [0, 0];
  showmap: boolean = false;
  getAirportCoordinates: any;
  usingLiveLocation: boolean = false;
  locationFetched: boolean = false;
  showAlert: boolean = false;
  freeTrialCount!: number;
  isSubscribed: boolean = false;
  screenshotUrl: string | null = null;
  public isCheckboxSelected: boolean = false;
  public insideMapData = { elevation: "", permissibleHeight: "", latitudeDMS: "", longitudeDMS: "", newDistance: "" }
  public outsideMapData = { airport_name: "", latitudeDMS: "", longitudeDMS: "", newDistance: "" }
  public closestAirportList: { airportCity: string, airportName: string, distance: number }[] = [];
  nearestAirportGeoJSONLayer: any;
  isFetchingGeoJSON = false;
  airportName!: string;
  distance!: number;
  isDefaultElevationSelected: boolean = false;
  autoSelectAirportCity: boolean = false;
  isGeoJSONNotFound: boolean = false
  latitudeErrors: any;
  longitudeErrors: any;
  requestForm!: FormGroup;
  airportCoordinatesList: Array<[number, number, string, string]> = [];
  secretKey = 'jwertyuhfdsxajwk2ejndoxpdfrgtjhngfvgbhyujhgfdsawaxcdfvgthyuhgbfvdcsdefrgthyjuhnbfgvdcsa';
  constructor(private formBuilder: FormBuilder, private toastr: ToastrService, public apiservice: ApiService, private formbuilder: FormBuilder, private http: HttpClient, private router: Router) {
  }
 
  ngOnInit(): void {
    this.initializeForm();
    this.handleSelectionModeChanges();
    this.handleLatitudeLongitudeChanges();
    this.handleCityChanges();
    this.handleAirportNameChanges();
    this.fetchAirports();
    this.showDefaultMap();
    this.loadAirportData();
    this.requestForm = this.formBuilder.group({
      service2: [false],
    });
  }
 
  initializeForm() {
    this.TopElevationForm = this.formbuilder.group({
      Latitude: [
        this.latitudeDMS || '',
        [
          Validators.required,
          Validators.pattern(/^(\d{1,3})[°\s]?(\d{1,2})[’'\s]?(\d{1,2}(?:\.\d+)?)[″"\s]?[NS]?$/i)
        ]
      ],
      Longitude: [
        this.longitudeDMS || '',
        [
          Validators.required,
          Validators.pattern(/^(\d{1,3})[°\s]?(\d{1,2})[’'\s]?(\d{1,2}(?:\.\d+)?)[″"\s]?[EW]?$/i)
        ]
      ],
      CITY: [''],
      location: [''],
      elevationOption: ['', Validators.required],
      Site_Elevation: ['', []],
      snapshot: [''],
      airportName: [''],
      selectionMode: ['']
    });
  }
 
  parseDMS(input: string): { degrees: number, minutes: number, seconds: number, direction: string } | null {
    const dmsPattern = /^(\d{1,3})[°\s]?(\d{1,2})[’'\s]?(\d{1,2}(?:\.\d+)?)[″"\s]?([NSWE])?$/i;
    const match = input.match(dmsPattern);
 
    if (match) {
      return {
        degrees: parseInt(match[1], 10),
        minutes: parseInt(match[2], 10),
        seconds: parseFloat(match[3]),
        direction: match[4]
      };
    } else {
      return null;
    }
  }
 
  handleSelectionModeChanges() {
    this.TopElevationForm.get('selectionMode')?.valueChanges.subscribe((selectionMode: string) => {
      const cityControl = this.TopElevationForm.get('CITY');
      const airportNameControl = this.TopElevationForm.get('airportName');
      if (selectionMode === 'manual' || selectionMode === 'default') {
        cityControl?.setValidators([Validators.required]);
        airportNameControl?.clearValidators();
      } else {
        cityControl?.clearValidators();
        airportNameControl?.clearValidators();
      }
      if (selectionMode === 'manual') {
        this.TopElevationForm.patchValue({
          CITY: '',
          airportName: ''
        });
      }
      cityControl?.updateValueAndValidity();
      airportNameControl?.updateValueAndValidity();
    });
  }
 
  handleLatitudeLongitudeChanges() {
    this.TopElevationForm.get('Latitude').valueChanges.subscribe((latitudeDMS: string) => {
      const lat = this.convertDMSStringToDD(latitudeDMS);
      if (lat !== null) {
        this.lat = lat; // Store the latitude value
        if (this.long !== null) {
          this.updateMarkersPosition(this.lat, this.long);
        }
 
        // Update nearest airport data if selectionMode is 'default'
        if (this.TopElevationForm.value.selectionMode === 'default') {
          this.updateNearestAirportData();
        }
      }
    });
    this.TopElevationForm.get('Longitude').valueChanges.subscribe((longitudeDMS: string) => {
      const lng = this.convertDMSStringToDD(longitudeDMS);
      if (lng !== null) {
        this.long = lng; // Store the longitude value
        if (this.lat !== null) {
          this.updateMarkersPosition(this.lat, this.long);
        }
        if (this.TopElevationForm.value.selectionMode === 'default') {
          this.updateNearestAirportData();
        }
      }
    });
  }
 
  handleCityChanges() {
    this.TopElevationForm.get('CITY').valueChanges.subscribe((city: string) => {
      this.city = city;
      this.onCityChange();
      // Remove any existing GeoJSON layers or markers
      if (this.geojsonLayer) {
        this.map.removeLayer(this.geojsonLayer);
        this.geojsonLayer = null;
      }
      if (this.marker2) {
        this.map.removeLayer(this.marker2);
        this.marker2 = null;
      }
      this.map.eachLayer((layer: any) => {
        if (layer instanceof L.GeoJSON) {
          this.map.removeLayer(layer);
        }
      });
      this.filteredAirports = this.airports.filter(airport => airport.airport_city === city);
 
      if (this.filteredAirports.length > 1) {
        this.TopElevationForm.addControl('airportName', new FormControl('', Validators.required));
      } else {
        this.TopElevationForm.removeControl('airportName');
      }
      const selectedAirport = this.filteredAirports.length === 1 ? this.filteredAirports[0] : null;
      this.selectedAirport = selectedAirport;
      this.selectedAirportName = selectedAirport ? selectedAirport.airport_name : '';
      this.selectedAirportIcao = selectedAirport ? selectedAirport.airport_icao : '';
      this.selectedAirportIATA = selectedAirport ? selectedAirport.airport_iata : '';
      this.handleGeoJSONLoading(city);
    });
  }
 
  async onCityChange() {
    const selectedCity = this.TopElevationForm.get('CITY')?.value;
    const elevationOptionControl = this.TopElevationForm.get('elevationOption')?.value;
    if (elevationOptionControl === 'default' && selectedCity) {
      try {
        const elevation = await this.getElevationForCity(selectedCity);
        const defaultElevation = this.feetToMeters(elevation); // Convert to meters if needed
        this.TopElevationForm.patchValue({ Site_Elevation: defaultElevation });
        this.toastr.info(`Elevation updated based on the selected city (${selectedCity}).`);
      } catch (error) {
        console.error('Error fetching elevation data:', error);
        this.toastr.error('Failed to fetch or convert elevation data.');
      }
    } else if (elevationOptionControl === 'manual') {
      this.TopElevationForm.patchValue({ Site_Elevation: '' });
    }
  }
  
 
  handleAirportNameChanges() {
    this.TopElevationForm.get('airportName')?.valueChanges.subscribe((airportName: string) => {
      const selectedAirport = this.airports.find(airport => airport.airport_name === airportName);
      this.selectedAirport = selectedAirport;
      this.selectedAirportIcao = selectedAirport ? selectedAirport.airport_icao : '';
      this.selectedAirportIATA = selectedAirport ? selectedAirport.airport_iata : '';
    });
  }
 
  handleGeoJSONLoading(city: string) {
    this.apiservice.getAirportData()
      .subscribe(
        data => {
          try {
            const cityData = data.features.find((feature: { properties: { city: string; }; }) => feature.properties.city === city);
            if (cityData) {
              this.loadGeoJSON(this.map, { type: 'FeatureCollection', features: [cityData] });
            } else {
              if (this.geojsonLayer) {
                this.map.removeLayer(this.geojsonLayer);
              }
            }
          } catch (error) {
            console.error('Error processing GeoJSON data:', error);
          }
        },
        error => {
          console.error('Error fetching GeoJSON data:', error);
        }
      );
  }


  resetForm() {
    this.TopElevationForm.reset();
    if (this.geojsonLayer) {
      this.map.removeLayer(this.geojsonLayer);
      this.geojsonLayer.clearLayers();
      this.geojsonLayer = null;
    }
    if (this.marker2) {
      this.map.removeLayer(this.marker2);
    }
    if (this.nearestAirportGeoJSONLayer) {
      this.map.removeLayer(this.nearestAirportGeoJSONLayer);
      this.nearestAirportGeoJSONLayer = null;
    }
    if (this.marker2) {
      this.map.removeLayer(this.marker2);
    }
    if (this.marker) {
      this.map.removeLayer(this.marker);
    }
    this.map.eachLayer((layer: any) => {
      if (layer instanceof L.GeoJSON) {
        this.map.removeLayer(layer);
      }
    });
    const latLng = L.latLng(0, 0);
    this.marker = L.marker(latLng).addTo(this.map);
  }
 
  showMissingFieldsAlert() {
    const missingFields = [];
    const controls = this.TopElevationForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        missingFields.push(name);
      }
    }
    alert(`Missing required fields: ${missingFields.join(', ')}`);
    this.toastr.error(`Missing required fields: ${missingFields.join(', ')}`, 'Form Incomplete');
  }
 
  loadAirportData() {
    this.apiservice.getAirportData()
      .subscribe(
        data => {
          if (data.type === 'FeatureCollection' && data.features) {
            this.airportCoordinatesList = [];
            data.features.forEach((feature: any) => {
              if (feature.geometry && feature.geometry.type === 'Point') {
                const coords = feature.geometry.coordinates as [number, number];
                const city = feature.properties.city;
                const airportName = feature.properties.airportName;
                if (coords.length === 2) {
                  // Add the airport data to the list
                  this.airportCoordinatesList.push([coords[1], coords[0], city, airportName]);
                }
              } else {
                console.error('Invalid feature:', feature);
              }
            });
          }
        },
        error => {
          console.error('Error fetching airport data:', error);
        }
      );
  }
  
 
   
  updateMarkersPosition(lat: number | null, lng: number | null): void {
    this.lat = lat !== null ? lat : this.lat;
    this.long = lng !== null ? lng : this.long;
    this.updateMarkerPosition();
  }
 
  updateMarkerPosition(): void {
    if (this.marker) {
      if (!isNaN(this.lat) && !isNaN(this.long)) {
        this.latitudeDMS = this.convertDDtoDMS(this.lat, true);
        this.longitudeDMS = this.convertDDtoDMS(this.long, false);
        this.marker.setLatLng([this.lat, this.long]);
        const popupContent = `Site Location : <br> Site Latitude: ${this.latitudeDMS}, Site Longitude: ${this.longitudeDMS}`;
        this.marker.bindPopup(popupContent).openPopup();
      }
    }
  }

  async submitForm() {
    if (!this.apiservice.token) {
      alert('Please Login First');
      this.router.navigate(['UsersLogin']);
      return;
    }
    const selectedAirportCITY = this.TopElevationForm.get('CITY')?.value;
    const nearestAirport = await this.findNearestAirport(this.lat, this.long, 30);
    const selectionMode = this.TopElevationForm.get('selectionMode')?.value;
    const selectedAirportGeojsonFilePath = `${this.apiservice.baseUrl}/geojson/${selectedAirportCITY}`;
    fetch(selectedAirportGeojsonFilePath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`The selected airport (${selectedAirportCITY}) does not have a published map.`);
        }
        return response.text();
      })
      .then(encryptedData => {
        const geoJsonData = this.decryptData(encryptedData);
        if (nearestAirport) {
          const nearestAirportGeojsonFilePath = `${this.apiservice.baseUrl}/geojson/${nearestAirport.airportCity}`;
          fetch(nearestAirportGeojsonFilePath)
            .then(response => {
              if (!response.ok) {
                throw new Error(`GeoJSON file not found for nearest airport (${nearestAirport.airportCity}).`);
              }
              return response.text();
            })
            .then(encryptedData => {
              const nearestGeoJsonData = this.decryptData(encryptedData);
              if (nearestAirport.airportCity !== selectedAirportCITY) {
                const updateConfirmation = confirm(
                  `The selected airport (${selectedAirportCITY}) is different from the nearest airport (${nearestAirport.airportCity}).\n` +
                  `Would you like to update to the nearest airport or continue with the current selection?`
                );
                if (updateConfirmation) {
                  this.TopElevationForm.patchValue({
                    CITY: nearestAirport.airportCity,
                    Site_Elevation: this.getElevationForCity(nearestAirport.airportCity)
                  });
                  this.selectedAirportName = nearestAirport.airportName;
                  const parsedData = JSON.parse(nearestGeoJsonData); // Validate JSON format
                  this.loadNearestAirportGeoJSON(nearestAirport.airportCity, nearestAirport.distance, this.map,parsedData);
                }
              }
              if (selectionMode === 'default' || selectionMode === 'manual' || (nearestAirport && nearestAirport.airportCity === selectedAirportCITY)) {
                const confirmation = confirm("Kindly confirm that the entered site information is correct or verify.");
                if (confirmation) {
                  this.captureScreenshot().then(() => {
                    this.createNocas();
                    this.showData();
                  });
                }
              }
            })
            .catch(error => {
            });
        } else {
          if (selectionMode !== 'default') {
            const confirmation = confirm("Kindly confirm that the entered site information is correct or verify.");
            if (confirmation) {
              this.captureScreenshot().then(() => {
                this.createNocas();
                this.showData();
              });
            }
          }
        }
      })
      .catch(error => {
        console.error('Error fetching selected airport GeoJSON:', error);
        const selectionMode = this.TopElevationForm.get('selectionMode')?.value;
        if (selectionMode === 'manual') {
          Swal.fire({
            html: `The selected airport <span style="color: red;">${selectedAirportCITY}</span> does not have a CCZM map published by the authorities. Please contact Cognitive Navigation for further assistance.`,
            icon: 'warning',
          });
        } else if (selectionMode === 'default' && nearestAirport) {
          Swal.fire({
            html: `The nearest airport <span style="color: red;">${nearestAirport.airportCity}</span> does not have a CCZM map published by the authorities. Please contact Cognitive Navigation for further assistance.`,
            icon: 'warning',
          });
        }
      });
  }
 
  decryptData = (encryptedData: string | CryptoJS.lib.CipherParams) => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  };
 
  loadGeoJSON(map: any,geoJsonData:any, zoomLevel = 10) {
    if (!map) {
      console.error("Map object is required to load GeoJSON.");
      return;
    }
    if (this.geojsonLayer) {
      map.removeLayer(this.geojsonLayer);
      this.geojsonLayer.clearLayers();
      this.geojsonLayer = null;
    }
    if (this.marker2) {
      map.removeLayer(this.marker2);
      this.marker2 = null;
    }
    const selectedAirportCITY = this.TopElevationForm.get('CITY')?.value;
    if (!selectedAirportCITY) {
      console.error("No city selected.");
      return;
    }
    const airportDataUrl = `${this.apiservice.baseUrl}/airportinfo/airportData`;

    fetch(airportDataUrl)
      .then(response => response.json())
      .then((data: any) => {
        if (data.type === 'FeatureCollection' && data.features) {
          const airportData: { [key: string]: { coords: [number, number] } } = {};
          data.features.forEach((feature: any) => {
            if (feature.geometry.type === 'Point') {
              const city = feature.properties.city;
              const coords = feature.geometry.coordinates as [number, number];
              airportData[city] = { coords };
            }
          });
          const airportInfo = airportData[selectedAirportCITY];
          if (airportInfo) {
            this.airportCoordinates = airportInfo.coords;
            map.setView(this.airportCoordinates, zoomLevel);
            const geoJsonApiUrl = `${this.apiservice.baseUrl}/geojson/${selectedAirportCITY}`;
            fetch(geoJsonApiUrl)
              .then(response => response.text())
              .then(encryptedData => {
                const geoJsonData = this.decryptData(encryptedData);
                if (geoJsonData && geoJsonData.type === 'FeatureCollection') {
                  const style = (feature: any) => {
                    const color = feature.properties.Color || '#FF0000'; // Default color if not provided
                    return { fillColor: color, weight: 2 };
                  };
                  this.geojsonLayer = L.geoJSON(geoJsonData, { style: style }).addTo(map);
                  map.fitBounds(this.geojsonLayer.getBounds());
                  const customIcon = L.icon({
                    iconUrl: 'assets/marker-airport.png',
                    shadowUrl: 'https://opentopomap.org/leaflet/images/marker-shadow.png',
                    iconSize: [40, 41],
                    shadowSize: [40, 41],
                    iconAnchor: [12, 40],
                  });
                  if (this.marker2) {
                    map.removeLayer(this.marker2);
                    this.marker2 = null;
                  }
                  this.marker2 = L.marker(this.airportCoordinates, { icon: customIcon }).addTo(map);
                  const popupContent = `ARP:
                    <p>${selectedAirportCITY} Airport</p><br>
                    Latitude: ${this.airportCoordinates[0].toFixed(2)}
                    Longitude: ${this.airportCoordinates[1].toFixed(2)}`;
                  this.marker2.bindPopup(popupContent).openPopup();
                  if (this.marker) {
                    map.removeLayer(this.marker);
                    this.marker = null;
                  }
                  this.marker = L.marker([this.lat, this.long]).addTo(map);
                } else {
                  console.error('Invalid GeoJSON data:', geoJsonData);
                }
              })
              .catch(error => {
                console.error('Error fetching GeoJSON:', error);
              });
          } else {
            console.error(`No data found for city: ${selectedAirportCITY}`);
          }
        } else {
          console.error('Invalid airport data:', data);
        }
      })
      .catch(error => {
        console.error('Error fetching airport data:', error);
      });
  }
  
 async updateNearestAirportData() {
    const nearestAirport =await  this.findNearestAirport(this.lat, this.long, 30);
    const selectionMode = this.TopElevationForm.get('selectionMode')?.value;
    if (!nearestAirport) {
      return;
    }
    const geojsonFilePath = `${this.apiservice.baseUrl}/geojson/${nearestAirport.airportCity}`;
    this.isGeoJSONNotFound = false;
    if (this.nearestAirportGeoJSONLayer) {
      this.map.removeLayer(this.nearestAirportGeoJSONLayer);
      this.nearestAirportGeoJSONLayer = null;
    }
    if (this.marker2) {
      this.map.removeLayer(this.marker2);
      this.marker2 = null;
    }
    fetch(geojsonFilePath)
      .then(response => {
        if (!response.ok) {
          this.isGeoJSONNotFound = true;
          throw new Error('GeoJSON file not found');
        }
        return response.text(); // Get the encrypted text
      })
      .then(encryptedData => {
        const geojsonData = this.decryptData(encryptedData); // Decrypt the data  
        this.loadNearestAirportGeoJSON(nearestAirport.airportCity, nearestAirport.distance, this.map, geojsonData);
        // Update the form if not in manual mode
        if (selectionMode !== 'manual') {
          this.TopElevationForm.patchValue({
            CITY: nearestAirport.airportCity,
            AIRPORT_NAME: nearestAirport.airportName,
            elevation:  this.getElevationForCity(nearestAirport.airportCity)
          });
        }
      })
      .catch(error => {
      });
  }
  
  loadNearestAirportGeoJSON(airportCity: string, distance: number, map: any, geojsonData: any) {
    const airportGeoJSONPath = `${this.apiservice.baseUrl}/geojson/${airportCity}`;
    this.isGeoJSONNotFound = false;
    if (this.isFetchingGeoJSON) {
      return;
    }
    this.isFetchingGeoJSON = true;
    if (this.nearestAirportGeoJSONLayer) {
      map.removeLayer(this.nearestAirportGeoJSONLayer);
      this.nearestAirportGeoJSONLayer = null;
    }
    if (this.marker2) {
      map.removeLayer(this.marker2);
      this.marker2 = null;
    }
    map.eachLayer((layer: any) => {
      if (layer instanceof L.GeoJSON) {
        map.removeLayer(layer);
      }
    });
    const features = geojsonData.features;
    const style = (feature: any) => {
      const color = feature.properties.Color;
      return { fillColor: color, weight: 1 };
    };
    const geojsonLayer = L.geoJSON(features, { style: style });
    geojsonLayer.addTo(map);
    this.nearestAirportGeoJSONLayer = geojsonLayer;
    const selectionMode = this.TopElevationForm.get('selectionMode')?.value;
    if (selectionMode === 'default') {
      this.TopElevationForm.patchValue({
        CITY: airportCity,
        AIRPORT_NAME: features[0].properties.AirportName
      });
    }
    this.marker2 = L.marker([features[0].geometry.coordinates[1], features[0].geometry.coordinates[0]]).addTo(map);
    const popupContent = `ARP:
    <p>${airportCity} Airport</p><br>
    Latitude: ${features[0].geometry.coordinates[1].toFixed(2)}
    Longitude: ${features[0].geometry.coordinates[0].toFixed(2)}`;
    this.marker2.bindPopup(popupContent).openPopup();
    this.isFetchingGeoJSON = false;
  }
  
  navigateToContact() {
    this.router.navigate(['/request-Service']);
  }
  convertDMSStringToDD(dmsString: string): number | null {
    const parsed = this.parseDMS(dmsString);
    if (parsed) {
      const { degrees, minutes, seconds, direction } = parsed;
      let dd = degrees + (minutes / 60) + (seconds / 3600);
      if (direction === 'S' || direction === 'W') {
        dd *= -1;
      }
      return dd;
    }
    return null;
  }
 
  captureScreenshot(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const mapElement = document.getElementById('map');
      if (mapElement) {
        domtoimage.toBlob(mapElement).then((blob: Blob) => {
          const formData = new FormData();
          formData.append('screenshot', blob, 'mapScreenshot.png');
          this.apiservice.saveScreenshot(formData).subscribe((response: any) => { resolve(response.filePath); },
            (error: any) => { console.error('Error saving screenshot:', error); reject('Error saving screenshot'); });
        }).catch(error => {
          console.error('Error capturing screenshot:', error);
          reject('Error capturing screenshot');
        });
      }
      else { reject('Map element not found'); }
    });
  }
 
  convertDDtoDMS(dd: number, isLatitude: boolean): string {
    const absolute = Math.abs(dd);
    const degrees = Math.floor(absolute);
    const minutes = Math.floor((absolute - degrees) * 60);
    let seconds = ((absolute - degrees - minutes / 60) * 3600).toFixed(2)
    seconds = parseFloat(seconds).toString();
    const direction = (isLatitude ? (dd >= 0 ? 'N' : 'S') : (dd >= 0 ? 'E' : 'W'));
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  }
 
  hideData() {
    const airportCITY = this.TopElevationForm.get('CITY')?.value;
    const latitude = parseFloat(this.TopElevationForm.get('Latitude')?.value);
    const longitude = parseFloat(this.TopElevationForm.get('Longitude')?.value);
    if (airportCITY && !isNaN(latitude) && !isNaN(longitude)) {
      this.updateMarkerPosition();
      this.showMap(latitude, longitude);
    }
  }
 
  subscribe() {
    this.router.navigate(['PricingPlans']);
  }
 
  MakePayment() {
    this.handlePayment()
  }
 
  handlePayment() {
    const baseAmount = 95; // Base amount without GST
    const gstRate = 0.18; // GST rate (18%)
    const gstAmount = baseAmount * gstRate; // Calculate GST
    const totalAmount = baseAmount + gstAmount; // Total amount with GST
  
    // Round the total amount to avoid decimals and convert it to paise for Razorpay
    const totalAmountRounded = Math.round(totalAmount);
  
    console.log(`Base Amount: ₹${baseAmount}, GST: ₹${gstAmount}, Total Amount: ₹${totalAmountRounded}`);
  
    const RazorpayOptions = {
      // key: 'rzp_test_IScA4BP8ntHVNp',
      key: 'rzp_live_7iwvKtQ79rijv2',
      amount: totalAmountRounded * 100, // Razorpay amount in paise (multiplied by 100)
      currency: 'INR',
      name: 'Cognitive Navigation Pvt. Ltd',
      description: `Plan Subscription`,
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZ4mHCqV6RQTwJIAON-ZK6QN9rdxF4YK_fLA&s',
      handler: (response: any) => {
        this.router.navigate(['TransactionDetails']);
        
        const paymentDetails = {
          user_id: this.apiservice.userData.id,
          subscription_type: 'OneTime',
          price: totalAmountRounded, // Use total amount with GST
          razorpay_payment_id: response.razorpay_payment_id,
          expiry_date: new Date().toISOString(),
        };
  
        const headers = new HttpHeaders().set("Authorization", `Bearer ${this.apiservice.token}`);
        let url = this.apiservice.baseUrl + '/subscription/addSubscription';
  
        this.apiservice.http.post<any>(url, paymentDetails, { headers: headers })
          .subscribe(
            (result: any) => {
              this.createNocas(result.subscription_id);
            },
            (error: any) => {
              console.error('Error storing payment details:', error);
            }
          );
  
        const confirmation = confirm("Payment Successfully Done. If you want to see payment details, please go to Transaction Details page");
        if (confirmation) {
          this.isSubscribed = true;
        }
        this.router.navigate(['C_NOCAS-MAP']);
        
        const airportCITY = this.TopElevationForm.get('CITY')?.value;
        const latitude = parseFloat(this.TopElevationForm.get('Latitude')?.value);
        const longitude = parseFloat(this.TopElevationForm.get('Longitude')?.value);
  
        if (airportCITY && !isNaN(latitude) && !isNaN(longitude)) {
          this.updateMarkerPosition();
          this.displayMapData(latitude, longitude, this.airportCoordinates);
          this.closeModal('airportModal');
        }
      },
      theme: {
        color: '#528FF0'
      },
      payment_method: {
        external: ['upi']
      }
    };
  
    const rzp = new Razorpay(RazorpayOptions);
    rzp.open();
  
    rzp.on('payment.success', (response: any) => {
      console.log("Payment success:", response);
    });
  
    rzp.on('payment.error', (error: any) => {
      alert("Payment Failed");
      console.error("Payment error:", error);
    });
  }
  
 
  async findNearestAirport(lat: number, lng: number, radius: number): Promise<{ airportCity: string; airportName: string; distance: number; elevation: number } | null> {
    const airports = this.airportCoordinatesList;
    let closestAirport = null;
    let minDistance = radius;
    for (const [airportLng, airportLat, airportCity, airportName] of airports) {
      const distance = this.calculateDistance(lat, lng, airportLat, airportLng);
      if (distance < minDistance) {
        const elevation = await this.getElevationForCity(airportCity);
        closestAirport = {
          airportCity,
          airportName,
          distance,
          elevation,
        };
        minDistance = distance;
      }
    }
    return closestAirport;
  }
  
  async getElevationForCity(city: string): Promise<number> {
    const apiEndpoint = `${this.apiservice.baseUrl}/airportinfo/airportData`;
    try {
      const response = await fetch(apiEndpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch airport data');
      }
      const geoJsonData = await response.json();
      const feature = geoJsonData.features.find((f: any) => f.properties.city === city);
      if (feature) {
        return this.feetToMeters(feature.properties.siteElevation);
      } else {
        throw new Error('City not found in the GeoJSON data');
      }
    } catch (error) {
      console.error('Error fetching elevation data:', error);
      return 0; // Return a default value or handle the error as needed
    }
  }
  
  feetToMeters(feet: number): number {
    return feet * 0.3048;
  }
 
  handleAirportModalOK() {
    this.distance = this.calculateDistance(this.lat, this.long, this.airportCoordinates[0], this.airportCoordinates[1]);
    const airport_name = this.selectedAirportName ? this.selectedAirportName.split('/')[0] : '';
    if (!this.isCheckboxSelected) {
      this.outsideMapData = {
        airport_name: airport_name,
        latitudeDMS: this.latitudeDMS,
        longitudeDMS: this.longitudeDMS,
        newDistance: this.distance.toFixed(2)
      };
      this.showModal('outsideMapData');
    }
  }
 
  async onElevationOptionChange() {
    const elevationOption = this.TopElevationForm.get('elevationOption')?.value;
    const selectedCity = this.TopElevationForm.get('CITY')?.value;
    if (elevationOption === 'default' && selectedCity) {
      try {
        const elevation = await this.getElevationForCity(selectedCity);
        const defaultElevation = this.feetToMeters(elevation); // Convert to meters if needed
        this.TopElevationForm.patchValue({ Site_Elevation: defaultElevation });
        this.toastr.info(`Elevation updated based on the selected city (${selectedCity}).`);
      } catch (error) {
        console.error('Error fetching elevation data:', error);
        this.toastr.error('Failed to fetch or convert elevation data.');
      }
    } else if (elevationOption === 'manual') {
      this.TopElevationForm.patchValue({ Site_Elevation: '' });
    }
  }
  
  async createNocas(subscription_id: string = "") {
    if (this.TopElevationForm.valid) {
      const screenshotPath = await this.captureScreenshot();
      const lat = parseFloat(this.TopElevationForm.value.Latitude); 
      const lng = parseFloat(this.TopElevationForm.value.Longitude); 
      const distance = this.calculateDistance(this.lat, this.long, this.airportCoordinates[0], this.airportCoordinates[1]); 
      const clickedFeature = this.geojsonLayer.getLayers().find((layer: any) => { 
        return layer.getBounds().contains([lat, lng]); }); 
        let elevation = 0; let permissibleHeight = 0; if (clickedFeature) 
          { const properties = clickedFeature.feature.properties; elevation = parseFloat(properties.name); 
            permissibleHeight = elevation - parseFloat(this.TopElevationForm.get('Site_Elevation').value); 
          } 
          const requestBody = { 
            user_id: this.apiservice.userData.id, 
            distance: this.insideMapData?.newDistance || (distance.toFixed(2)), 
            permissible_elevation: this.insideMapData?.elevation + "" || elevation + "", 
            permissible_height: this.insideMapData?.permissibleHeight || (permissibleHeight < 0 ? '-' : Math.abs(permissibleHeight).toFixed(2)), 
            city: this.TopElevationForm.value.CITY, 
            latitude: this.insideMapData?.latitudeDMS || this.latitudeDMS, 
            longitude: this.insideMapData?.longitudeDMS || this.longitudeDMS, 
            airport_name: this.selectedAirportName, site_elevation: this.TopElevationForm.value.Site_Elevation, 
            snapshot: screenshotPath, subscription_id: subscription_id, 
          }; 
          this.apiservice.createNocas(requestBody).subscribe((resultData: any) => { 
            if (resultData.isSubscribed) 
              { 
                this.isSubscribed = true;
              } 
            else { 
              this.isSubscribed = false; 
            } 
          }, 
            (error: any) => { 
              alert("Session Expired. Please Login again."); 
              localStorage.removeItem('userData'); 
              localStorage.removeItem('token'); 
              this.router.navigate(['UsersLogin']); 
            });
    } else { 
      alert("Please fill out all required fields in the form.");

     }
  }
 
  displayMapData(lat: number, lng: number, airportCoordinates: [number, number]) {
    const distance = this.calculateDistance(this.lat, this.long, this.airportCoordinates[0], this.airportCoordinates[1]);
    const clickedFeature = this.geojsonLayer.getLayers().find((layer: any) => {
      return layer.getBounds().contains([this.lat, this.long]);
    });
    if (clickedFeature) {
      const properties = clickedFeature.feature.properties;
      (properties)
      const elevation = properties.name;
      const permissibleHeight = parseFloat(properties.name) - parseFloat(this.TopElevationForm.get('Site_Elevation').value);
      if (elevation === 'NOC Required') {
        alert("The selected location requires a **No Objection Certificate (NOC)** for further processing. Please contact our support team for assistance.");
        return;
      }
      this.insideMapData = {
        elevation: elevation,
        permissibleHeight: permissibleHeight < 0 ? '-' : Math.abs(permissibleHeight).toFixed(2),
        latitudeDMS: this.latitudeDMS,
        longitudeDMS: this.longitudeDMS,
        newDistance: distance.toFixed(2)
      };
      // Display the insideMapData modal
      this.showModal('insideMapData');
    } else {
      this.handleAirportModalOK();
    }
  }
 
  updateSelectedAirport(airportCity: string, airportName: string, distance: number) {
    this.airportName = airportName;
    this.distance = distance;
    const airport = this.airportCoordinatesList.find(airport => airport[3] === airportName);
    const selectionMode = this.TopElevationForm.get('selectionMode')?.value;
    if (selectionMode === 'manual') {
      if (airport) {
        this.TopElevationForm.patchValue({
          CITY: airportCity,
        });
        this.selectedAirportName = airportName;
        this['selectedAirportCoordinates'] = [airport[0], airport[1]];
      }
    }
  }
 
  showData() {
    const airportCITY = this.TopElevationForm.get('CITY')?.value;
    const latitude = parseFloat(this.TopElevationForm.get('Latitude')?.value);
    const longitude = parseFloat(this.TopElevationForm.get('Longitude')?.value);
    if (airportCITY && !isNaN(latitude) && !isNaN(longitude)) {
      this.updateMarkerPosition();
      this.displayMapData(latitude, longitude, this.airportCoordinates);
      this.showMap(latitude, longitude);
    }
  }
 
  convertDMSToDD(dms: number, isLatitude: boolean): number {
    const degrees = Math.floor(dms);
    const minutes = Math.floor((dms - degrees) * 100);
    const seconds = Math.round(((dms - degrees) * 100 - minutes) * 100);
    const direction = isLatitude ? (dms >= 0 ? 'N' : 'S') : (dms >= 0 ? 'E' : 'W');
    const dd = degrees + minutes / 60 + seconds / (60 * 60);
    return direction === 'S' || direction === 'W' ? dd * -1 : dd;
  }
 
  getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.lat = position.coords.latitude;
          this.long = position.coords.longitude;
          this.latitudeDMS = this.convertDDtoDMS(this.lat, true);
          this.longitudeDMS = this.convertDDtoDMS(this.long, false);
          const popupContent = `Site Location : <br>  Site Latitude: ${this.latitudeDMS}, Site Longitude: ${this.longitudeDMS}`;
          this.marker.addTo(this.map).bindPopup(popupContent).openPopup();
          // this.updateMarkerPosition();
          this.TopElevationForm.patchValue({
            Latitude: this.latitudeDMS,
            Longitude: this.longitudeDMS
          });
        },
        (error) => {
          console.error('Error getting user location:', error);
          alert('Error getting user location. Please make sure location services are enabled and try again.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }
 
  showDefaultMap() {
    let defaultLat = 0;
    let defaultLong = 0;
    this.lat = defaultLat;
    this.long = defaultLong;
    this.showMap(this.lat, this.long);
  }
 
  showMap(lat: number, lng: number) {
    this.map = L.map('map', { zoomControl: false, attributionControl: false }).setView([20.5937, 78.9629], 5);
    const streets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    });
    const darkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {});
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {});
    const navigation = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16
    });
    const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });
    const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });
    const googleTerrain = L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });
    const baseMaps = {
      'Streets': streets,
      'Satellite': satellite,
      'Navigation': navigation,
      'Hybrid': googleHybrid,
      'Satellite Google': googleSat,
      'Terrain': googleTerrain,
      'Dark': darkMatter
    };
    const overlayMaps = {};
    // Create and add watermark control
    const WatermarkControl = L.Control.extend({
      onAdd: function () {
        const img = L.DomUtil.create('img');
        img.src = '/assets/CASPER_LOGO.png'; // Replace with your watermark image URL
        img.style.width = '100px';
        img.style.opacity = '1'; // Adjust transparency
        img.style.display = 'block';
        return img;
      }
    });
    // Add the watermark control to the map
    new WatermarkControl({ position: 'topleft' }).addTo(this.map);
    L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(this.map);
    streets.addTo(this.map);
    L.control.scale({ position: 'bottomright', metric: false }).addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
    }
    if (this.nearestAirportGeoJSONLayer) {
      this.map.removeLayer(this.nearestAirportGeoJSONLayer);
      this.nearestAirportGeoJSONLayer = null;
    }
    if (this.geojsonLayer) {
      this.map.removeLayer(this.geojsonLayer);
      this.geojsonLayer.clearLayers();
      this.geojsonLayer = null;
    }
    if (this.marker2) {
      this.map.removeLayer(this.marker2);
      this.marker2 = null;
    }
    if (this.nearestAirportGeoJSONLayer) {
      this.map.removeLayer(this.nearestAirportGeoJSONLayer);
      this.nearestAirportGeoJSONLayer = null;
    }
  }
  getCityLocation(cityName: string): { lat: number, lng: number } | null {
    return null;
  }
 
  showModal(id: string): void {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'block';
    }
  }
 
  closeModal(id: string): void {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }
 
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }
 
  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
 
  fetchAirports() {
    this.apiservice.fetchAirports().subscribe({
      next: (res) => {
        if (res && res.airports) {
          this.airports = res.airports.sort((a: { airport_city: string; }, b: { airport_city: any; }) => a.airport_city.localeCompare(b.airport_city));
        } else {
          console.error('No airports data received');
        }
      },
      error: (err) => {
        alert('Error fetching data');
        console.error('Error fetching airports:', err);
      }
    });
  }
 
  convertDMSsToDD(degrees: number, minutes: number, seconds: number, direction: string): number {
    let dd = degrees + (minutes / 60) + (seconds / 3600);
    if (direction === 'S' || direction === 'W') {
      dd = -dd;
    }
    return dd;
  }
 
  applyForNOC() {
    Swal.fire({
      title: 'Success!',
      text: `We have noted your request. Our team will contact you within 1 working day.`,
      icon: 'success',
      confirmButtonText: 'OK'
    });
    this.requestForm.patchValue({
      service2: true
    });
    this.createRequest();
  }
  
  createRequest() {
    if (this.requestForm.valid) {
      const requestData = {
        services: JSON.stringify(this.requestForm.value),
        user_id: this.apiservice.userData.id
      };
      this.apiservice.createRequest(requestData).subscribe(
        (result: any) => {
        },
        (error) => {
          console.error("Error creating request:", error);
          this.toastr.error("Error creating request");
        }
      );
    } else {
      this.toastr.warning('Please select a service.');
    }
  }
}
 
