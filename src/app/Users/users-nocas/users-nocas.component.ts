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
  constructor(private formBuilder: FormBuilder, private toastr: ToastrService, public apiservice: ApiService, private formbuilder: FormBuilder, private http: HttpClient, private router: Router) {
 
  }
 
  _filterAirports(value: string): any[] {
    const filterValue = value.toLowerCase();
    const filtered = this.airports.filter(airport => airport.airport_city.toLowerCase().includes(filterValue));
    (filtered); // Check if the filtered list is being populated
    return filtered;
  }
  ngOnInit(): void {
    this.initializeForm();
    this.handleSelectionModeChanges();
    this.handleLatitudeLongitudeChanges();
    this.handleCityChanges();
    this.handleAirportNameChanges();
    this.fetchAirports();
    this.showDefaultMap();
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
    // Watch for changes in Latitude
    this.TopElevationForm.get('Latitude').valueChanges.subscribe((latitudeDMS: string) => {
      const lat = this.convertDMSStringToDD(latitudeDMS);
      if (lat !== null) {
        this.lat = lat; // Store the latitude value
 
        // Update markers position only if longitude is also valid
        if (this.long !== null) {
          this.updateMarkersPosition(this.lat, this.long);
        }
 
        // Update nearest airport data if selectionMode is 'default'
        if (this.TopElevationForm.value.selectionMode === 'default') {
          this.updateNearestAirportData();
        }
      }
    });
 
    // Watch for changes in Longitude
    this.TopElevationForm.get('Longitude').valueChanges.subscribe((longitudeDMS: string) => {
      const lng = this.convertDMSStringToDD(longitudeDMS);
      if (lng !== null) {
        this.long = lng; // Store the longitude value
 
        // Update markers position only if latitude is also valid
        if (this.lat !== null) {
          this.updateMarkersPosition(this.lat, this.long);
        }
 
        // Update nearest airport data if selectionMode is 'default'
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
 
      // Handle GeoJSON loading for the selected city
      this.handleGeoJSONLoading(city);
    });
  }
 
  onCityChange() {
    const selectedCity = this.TopElevationForm.get('CITY')?.value;
    const elevationOptionControl = this.TopElevationForm.get('elevationOption')?.value;
 
    // Check if the default elevation option is selected
    if (elevationOptionControl === 'default') {
      const elevation = this.getElevationForCity(selectedCity); // Fetch the elevation for the city
      const defaultElevation = this.feetToMeters(elevation); // Convert to meters if needed
 
      // Update the form with the default elevation
      this.TopElevationForm.patchValue({ Site_Elevation: defaultElevation });
 
      // Notify the user
      this.toastr.info(`Elevation updated based on the selected city (${selectedCity}).`);
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
    const citiesWithGeoJSON = [
      'Puri', 'Mumbai', 'Coimbatore', 'Ahemdabad', 'Akola', 'Chennai',
      'Delhi', 'Guwahati', 'Hyderabad', 'Jaipur', 'Nagpur', 'Thiruvananthapuram',
      'Vadodara', 'Varanasi', 'Agatti', 'Aligarh', 'Ambikapur', 'Amritsar',
      'Aurangabad', 'Azamgarh', 'Balurghat', 'Baramati', 'Belgaum',
      'Berhampur', 'Bial', 'Bokaro', 'Cochin', 'Deesa', 'Diburgarh',
      'Diu', 'Durgapur', 'Gaya', 'Hisar', 'Hubli', 'Imphal', 'Jabalpur',
      'Jewer', 'Jharsaugada', 'Jogbani', 'Kadapa', 'Kandla', 'Kangra',
      'Kannur', 'Keshod', 'Khajuraho', 'Kishangarh', 'Kullu', 'Kurnool',
      'Kushinagar', 'Lalitpur', 'Lilabari', 'Lucknow', 'Ludhiana', 'Mangalore', 'Meerut',
      'Muzaffarpur', 'Mysore', 'Nanded', 'Pakyong', 'Pantnagar',
      'Patna', 'Porbandar', 'Rajamundary', 'Rourkela', 'Shirdi',
      'Sholapur', 'Tiruchirapalli', 'Tirupati', 'Udaipur', 'Utkela',
      'Vellore', 'Warangal', 'Calicut', 'Agartala', 'Dimapur', 'Kota',
      'Madurai', 'Kolhapur', 'Kolkata', 'Bhopal', 'Mopa', 'Bhavnagar',
      'Dehradun', 'Hirsar', 'Jamshedpur', 'Deoghar', 'Donakonda', 'Bengaluru',
      'Shimla', 'Cooch Behar', 'Bhuvneshwar', 'Tuticorin',
      'Jeypore', 'Jalgaon', 'Puducherry', 'Raipur', 'Ranchi',
      'Surat', 'Vijaywada', 'Birlamgram', 'Ayodhya', 'Chitrakoot', 'Ghaziabad', 'Ambala', 'Goa', 'Pune', 'Cimbatore', 'Arakkonnam',
      'Jodhpur', 'Leh', 'Pathankot', 'Nicobar islands', 'Tezpur',
      'Thanjavur', 'Agra', 'Kochi', 'Banglore', 'Aizawl', 'Shillong', 'Bilaspur', 'Indore', 'Itanagar', 'Gondia', 'Nashik', 'Jagdalpur', 'Vidyanagar', 'Kalaburagi', 'Moradabad', 'Pithoragarh', 'Rupsi', 'Salem', 'Shivamogga', 'Sindhudurg', 'Tezu', 'Angul', 'Koppal', 'Beas', 'Hosur', 'Raigarh', 'Puttaparthi'
    ];
    if (citiesWithGeoJSON.includes(city)) {
      this.loadGeoJSON(this.map);
    } else {
      if (this.geojsonLayer) {
        this.map.removeLayer(this.geojsonLayer);
      }
    }
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
 
  submitForm() {
    if (!this.apiservice.token) {
      alert('Please Login First');
      this.router.navigate(['UsersLogin']);
      return;
    }
 
    // if (!this.TopElevationForm.valid) {
    //   return;
    // }
 
    const selectedAirportCITY = this.TopElevationForm.get('CITY')?.value;
    const nearestAirport = this.findNearestAirport(this.lat, this.long, 30);
    const selectionMode = this.TopElevationForm.get('selectionMode')?.value;
    const selectedAirportGeojsonFilePath = `assets/GeoJson/${selectedAirportCITY}.geojson`;
 
    // Check if the selected city has a published GeoJSON map
    fetch(selectedAirportGeojsonFilePath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`The selected airport (${selectedAirportCITY}) does not have a published map.`);
        }
        return response.json();
      })
      .then(() => {
        if (nearestAirport) {
          const nearestAirportGeojsonFilePath = `assets/GeoJson/${nearestAirport.airportCity}.geojson`;
 
          fetch(nearestAirportGeojsonFilePath)
            .then(response => {
              if (!response.ok) {
                throw new Error(`GeoJSON file not found for nearest airport (${nearestAirport.airportCity}).`);
              }
              return response.json();
            })
            .then(() => {
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
                  this.loadNearestAirportGeoJSON(nearestAirport.airportCity, nearestAirport.distance, this.map);
                }
              }
 
              // Show confirmation only if both selected and nearest airport have valid CCZM maps
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
              console.error(error);
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
          } else {
            // this.toastr.info('No airport found within the specified radius.');
          }
        }
      })
      .catch(error => {
        console.error(error);
        const selectionMode = this.TopElevationForm.get('selectionMode')?.value;
        if (selectionMode === 'manual') {
          Swal.fire({
            html: `The selected airport <span style="color: red;">${selectedAirportCITY}</span> does not have a CCZM map published by the authorities. Please contact Cognitive Navigation for further assistance.`,
            icon: 'warning',
          });
        } else if (selectionMode === 'default' && nearestAirport) {
          ("defrt")
          Swal.fire({
            html: `The nearest airport <span style="color: red;">${nearestAirport.airportCity}</span> does not have a CCZM map published by the authorities. Please contact Cognitive Navigation for further assistance.`,
            icon: 'warning',
          });
        }
      });
  }
 
 
  findNearestAirport(lat: number, lng: number, radius: number): { airportCity: string; airportName: string; distance: number; elevation: number } | null {
    const airports = this.airportCoordinatesList;
    let closestAirport = null;
    let minDistance = radius;
    for (const [airportLat, airportLng, airportCity, airportName] of airports) {
      const distance = this.calculateDistance(lat, lng, airportLat, airportLng);
      if (distance < minDistance) {
        closestAirport = {
          airportCity,
          airportName,
          distance,
          elevation: this.getElevationForCity(airportCity)  // Changed from `this.city` to `airportCity`
        };
        minDistance = distance;
      }
    }
    if (closestAirport) {
      (`Nearest Airport: ${closestAirport.airportName}, Distance: ${closestAirport.distance}`);
    } else {
      const selectionMode = this.TopElevationForm.get('selectionMode')?.value;
      if (selectionMode === 'default') {
        if (this.geojsonLayer) {
          this.map.removeLayer(this.geojsonLayer);
          this.geojsonLayer.clearLayers();
          this.geojsonLayer = null;
        }
        if (this.marker2) {
          this.map.removeLayer(this.marker2);
          this.marker2 = null;
        }
        this.toastr.info('No airport found within the specified radius.');
      }
    }
    return closestAirport;
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
 
 
 
  loadGeoJSON(map: any, zoomLevel: number = 10) {
    if (!map) {
      console.error("Map object is required to load GeoJSON.");
      return;
    }
 
    // Remove existing GeoJSON layer and marker if they exist
    if (this.geojsonLayer) {
      map.removeLayer(this.geojsonLayer);
      this.geojsonLayer.clearLayers();
      this.geojsonLayer = null;
    }
 
    if (this.marker2) {
      map.removeLayer(this.marker2);
      this.marker2 = null;
    }
 
    // Get selected city from the form
    const selectedAirportCITY = this.TopElevationForm.get('CITY')?.value;
    if (selectedAirportCITY) {
      const airportData: { [key: string]: { path: string, coords: [number, number] } } = {
        'Puri': { path: 'assets/GeoJson/Puri.geojson', coords: [19.81, 85.83] },
        'Mumbai': { path: 'assets/GeoJson/Mumbai.geojson', coords: [19.09155556, 72.86597222] },
        'Coimbatore': { path: 'assets/GeoJson/Coimbatore.geojson', coords: [11.02691111, 77.04180278] },
        'Ahemdabad': { path: 'assets/GeoJson/Ahemdabad.geojson', coords: [23.07119167, 72.62643333] },
        'Akola': { path: 'assets/GeoJson/Akola.geojson', coords: [20.69851583, 77.05776056] },
        'Chennai': { path: 'assets/GeoJson/Chennai.geojson', coords: [12.99510000, 80.17360278] },
        'Delhi': { path: 'assets/GeoJson/Delhi.geojson', coords: [28.61, 77.20] },
        'Guwahati': { path: 'assets/GeoJson/Guwahati.geojson', coords: [26.10502222, 91.58543889] },
        'Hyderabad': { path: 'assets/GeoJson/Chennai.geojson', coords: [17.38, 78.48] },
        'Jaipur': { path: 'assets/GeoJson/Jaipur.geojson', coords: [26.82417278, 75.80247833] },
        'Nagpur': { path: 'assets/GeoJson/Nagpur.geojson', coords: [21.09172500, 79.04819722] },
        'Thiruvananthapuram': { path: 'assets/GeoJson/Trivendrum.geojson', coords: [8.49319444, 76.90915833] },
        'Vadodara': { path: 'assets/GeoJson/Vadodara.geojson', coords: [22.33004167, 73.21884444] },
        'Varanasi': { path: 'assets/GeoJson/Varanasi.geojson', coords: [25.45121111, 82.85860556] },
        'Agatti': { path: 'assets/GeoJson/Agatti.geojson', coords: [10.82421944, 72.17663611] },
        'Aligarh': { path: 'assets/GeoJson/Aligarh.geojson', coords: [27.86130000, 78.14706944] },
        'Ambikapur': { path: 'assets/GeoJson/Ambikapur.geojson', coords: [22.99345833, 83.19275222] },
        'Amritsar': { path: 'assets/GeoJson/Amritsar.geojson', coords: [31.71059167, 74.80015556] },
        'Aurangabad': { path: 'assets/GeoJson/Aurangabad.geojson', coords: [19.86439444, 75.39756111] },
        'Azamgarh': { path: 'assets/GeoJson/Azamgarh.geojson', coords: [26.15734917, 83.11402361] },
        'Balurghat': { path: 'assets/GeoJson/Balurghat.geojson', coords: [25.26355000, 88.79562750] },
        'Baramati': { path: 'assets/GeoJson/Baramati.geojson', coords: [18.22662222, 74.58969722] },
        'Belgaum': { path: 'assets/GeoJson/Belgaum.geojson', coords: [15.85840278, 74.61769167] },
        'Berhampur': { path: 'assets/GeoJson/Berhampur.geojson', coords: [19.29156278, 84.87916861] },
        'Bial': { path: 'assets/GeoJson/Bial.geojson', coords: [13.19887167, 77.70547778] },
        'Bokaro': { path: 'assets/GeoJson/Bokaro.geojson', coords: [23.64352944, 86.14964472] },
        'Cochin': { path: 'assets/GeoJson/Cochin.geojson', coords: [10.15, 76.40] },
        'Deesa': { path: 'assets/GeoJson/Deesa.geojson', coords: [24.26777778, 72.20277778] },
        'Diburgarh': { path: 'assets/GeoJson/Diburgarh.geojson', coords: [27.86130000, 78.14706944] },
        'Diu': { path: 'assets/GeoJson/Diu.geojson', coords: [20.71379444, 70.92288056] },
        'Durgapur': { path: 'assets/GeoJson/Aligarh.geojson', coords: [23.62444444, 87.24250000] },
        'Gaya': { path: 'assets/GeoJson/Gaya.geojson', coords: [24.74803889, 84.94243611] },
        'Hisar': { path: 'assets/GeoJson/Hisar.geojson', coords: [29.15, 75.73] },
        'Hubli': { path: 'assets/GeoJson/Hubli.geojson', coords: [15.36183889, 75.08436667] },
        'Imphal': { path: 'assets/GeoJson/Imphal.geojson', coords: [24.76431667, 93.89963889] },
        'Jabalpur': { path: 'assets/GeoJson/Aligarh.geojson', coords: [23.18337222, 80.06044444] },
        'Jewer': { path: 'assets/GeoJson/Jewer.geojson', coords: [28.17561111, 77.60624167] },
        'Jharsaugada': { path: 'assets/GeoJson/Jharsaugada.geojson', coords: [21.91481944, 84.04869167] },
        'Jogbani': { path: 'assets/GeoJson/Jogbani.geojson', coords: [26.29618056, 87.28654722] },
        'Kadapa': { path: 'assets/GeoJson/Kadapa.geojson', coords: [14.51304722, 78.77219167] },
        'Kandla': { path: 'assets/GeoJson/Jewer.geojson', coords: [23.11220000, 70.10056667] },
        'Kangra': { path: 'assets/GeoJson/Kangra.geojson', coords: [32.16473611, 76.26215556] },
        'Kannur': { path: 'assets/GeoJson/Kannur.geojson', coords: [11.91573056, 75.54572222] },
        'Keshod': { path: 'assets/GeoJson/Keshod.geojson', coords: [21.31498889, 70.26913889] },
        'Khajuraho': { path: 'assets/GeoJson/Khajuraho.geojson', coords: [24.81983056, 79.91857500] },
        'Kishangarh': { path: 'assets/GeoJson/Kishangarh.geojson', coords: [26.60125, 74.81415] },
        'Kullu': { path: 'assets/GeoJson/Kullu.geojson', coords: [31.87681389, 77.15525833] },
        'Kurnool': { path: 'assets/GeoJson/Kurnool.geojson', coords: [15.71475556, 78.16298611] },
        'Kushinagar': { path: 'assets/GeoJson/Kushinagar.geojson', coords: [26.77277778, 83.89527778] },
        'Lalitpur': { path: 'assets/GeoJson/Lalitpur.geojson', coords: [24.71647083, 78.41612444] },
        'Lilabari': { path: 'assets/GeoJson/Lilabari.geojson', coords: [27.29122778, 94.09352778] },
        'Lucknow': { path: 'assets/GeoJson/Lucknow.geojson', coords: [26.76185278, 80.88342778] },
        'Ludhiana': { path: 'assets/GeoJson/Ludiana.geojson', coords: [30.90, 75.85] },
        'Mangalore': { path: 'assets/GeoJson/Manglore.geojson', coords: [12.96139611, 74.89004722] },
        'Meerut': { path: 'assets/GeoJson/Meerut.geojson', coords: [28.58744583, 77.70449167] },
        'Muzaffarpur': { path: 'assets/GeoJson/Muzaffarpur.geojson', coords: [26.12, 85.38] },
        'Mysore': { path: 'assets/GeoJson/Mysore.geojson', coords: [12.30, 76.65] },
        'Nanded': { path: 'assets/GeoJson/Nanded.geojson', coords: [19.18103861, 77.32254722] },
        'Pakyong': { path: 'assets/GeoJson/Pakyong.geojson', coords: [27.13, 88.61] },
        'Pantnagar': { path: 'assets/GeoJson/Patanagar.geojson', coords: [29.03214722, 79.47246944] },
        'Patna': { path: 'assets/GeoJson/Patna.geojson', coords: [25.59361111, 85.09183333] },
        'Porbandar': { path: 'assets/GeoJson/Porbandar.geojson', coords: [21.65034583, 69.65880028] },
        'Rajamundary': { path: 'assets/GeoJson/Rajamundary.geojson', coords: [17.10944444, 81.81944444] },
        'Rourkela': { path: 'assets/GeoJson/Rourkela.geojson', coords: [22.25623889, 84.81460833] },
        'Shirdi': { path: 'assets/GeoJson/Shirdi.geojson', coords: [19.69083333, 74.37166667] },
        'Sholapur': { path: 'assets/GeoJson/Sholapur.geojson', coords: [17.62765278, 75.93403889] },
        'Tiruchirapalli': { path: 'assets/GeoJson/Tiruchirapalli.geojson', coords: [10.765, 78.710] },
        'Tirupati': { path: 'assets/GeoJson/Tirupati.geojson', coords: [13.63296389, 79.54190833] },
        'Udaipur': { path: 'assets/GeoJson/Udaipur.geojson', coords: [20.09765028, 83.18355250] },
        'Utkela': { path: 'assets/GeoJson/Utkela.geojson', coords: [20.459722, 83.818333] },
        'Vellore': { path: 'assets/GeoJson/Vellore.geojson', coords: [12.90810639, 79.06714361] },
        'Warangal': { path: 'assets/GeoJson/Warangal.geojson', coords: [17.91703361, 79.59933194] },
        'Calicut': { path: 'assets/GeoJson/Calicut.geojson', coords: [11.13785000, 75.95057222] },
        'Agartala': { path: 'assets/GeoJson/Agartala.geojson', coords: [23.89055556, 91.23916667] },
        'Dimapur': { path: 'assets/GeoJson/Dimapur.geojson', coords: [25.88345756, 93.77135750] },
        'Kota': { path: 'assets/GeoJson/Kota.geojson', coords: [25.16008333, 75.84783333] },
        'Madurai': { path: 'assets/GeoJson/Madurai.geojson', coords: [9.83500000, 78.08861111] },
        'Kolhapur': { path: 'assets/GeoJson/Kolhapur.geojson', coords: [16.66637222, 74.29048056] },
        'Kolkata': { path: 'assets/GeoJson/Kolkata.geojson', coords: [22.65473944, 88.44672222] },
        'Bhopal': { path: 'assets/GeoJson/Bhopal.geojson', coords: [23.28691944, 77.33696389] },
        'Mopa': { path: 'assets/GeoJson/Mopa.geojson', coords: [15.74249889, 73.86701028] },
        'Bhavnagar': { path: 'assets/GeoJson/Bhavnagar.geojson', coords: [21.75425139, 72.19052528] },
        'Dehradun': { path: 'assets/GeoJson/Dehradun.geojson', coords: [30.19063056, 78.18222222] },
        'Hirsar': { path: 'assets/GeoJson/Hirsar.geojson', coords: [29.1833, 75.7167] },
        'Jamshedpur': { path: 'assets/GeoJson/Jamshedpur.geojson', coords: [22.81455417, 86.16901472] },
        'Deoghar': { path: 'assets/GeoJson/Deoghar.geojson', coords: [24.44637500, 86.71666667] },
        'Donakonda': { path: 'assets/GeoJson/Donakonda.geojson', coords: [15.82472167, 79.48233389] },
        'Shimla': { path: 'assets/GeoJson/Shimla.geojson', coords: [31.08158083, 77.06767694] },
        'Cooch Behar': { path: 'assets/GeoJson/CoochBehar.geojson', coords: [26.32965556, 89.46711389] },
        'Bhuvneshwar': { path: 'assets/GeoJson/Bhuvneshwar.geojson', coords: [20.26420972, 85.80248556] },
        'Tuticorin': { path: 'assets/GeoJson/Tuticorin.geojson', coords: [8.72229167, 78.02617500] },
        'Bengaluru': { path: 'assets/GeoJson/Banglore.geojson', coords: [13.19887167, 77.70547778] },
        'Jeypore': { path: 'assets/GeoJson/Jaypore.geojson', coords: [18.88055558, 82.55361111] },
        'Jalgaon': { path: 'assets/GeoJson/Jalgaon.geojson', coords: [20.96130556, 75.62459722] },
        'Puducherry': { path: 'assets/GeoJson/Puducherry.geojson', coords: [11.96731944, 79.81143056] },
        'Raipur': { path: 'assets/GeoJson/Raipur.geojson', coords: [21.18100056, 81.73859194] },
        'Ranchi': { path: 'assets/GeoJson/Ranchi.geojson', coords: [23.31416667, 85.32111111] },
        'Surat': { path: 'assets/GeoJson/Surat.geojson', coords: [21.11604444, 72.74181944] },
        'Vijaywada': { path: 'assets/GeoJson/Vijaywada.geojson', coords: [16.533597, 80.803283] },
        'Birlamgram': { path: 'assets/GeoJson/Birlamgram.geojson', coords: [23.45, 75.416667] },
        'Ayodhya': { path: 'assets/GeoJson/Ayodhya.geojson', coords: [26.7980, 82.2080] },
        'Chitrakoot': { path: 'assets/GeoJson/Chitrakoot.geojson', coords: [25.2320, 80.8250] },
        'Ghaziabad': { path: 'assets/GeoJson/Ghaziabad.geojson', coords: [28.707778, 77.358333] },
        'Ambala': { path: 'assets/GeoJson/Ambala.geojson', coords: [30.370833, 76.817778] },
        'Goa': { path: 'assets/GeoJson/Goa.geojson', coords: [15.3725, 73.831389] },
        'Pune': { path: 'assets/GeoJson/Pune.geojson', coords: [18.582222, 73.919722] },
        'Cimbatore': { path: 'assets/GeoJson/Cimbatore.geojson', coords: [11.013611, 77.159722] },
        'Arakkonnam': { path: 'assets/GeoJson/Arakkonnam.geojson', coords: [13.071111, 79.691111] },
        'Jodhpur': { path: 'assets/GeoJson/Jodhpur.geojson', coords: [26.257222, 73.051667] },
        'Leh': { path: 'assets/GeoJson/Leh.geojson', coords: [34.135833, 77.545278] },
        'Pathankot': { path: 'assets/GeoJson/Pathankot.geojson', coords: [32.233611, 75.634444] },
        'Nicobar islands': { path: 'assets/GeoJson/NicobarIslands.geojson', coords: [9.1525, 92.819722] },
        'Tezpur': { path: 'assets/GeoJson/Tezpur.geojson', coords: [26.712222, 92.787222] },
        'Thanjavur': { path: 'assets/GeoJson/Thanjavur.geojson', coords: [10.722222, 79.101389] },
        'Agra': { path: 'assets/GeoJson/Agra.geojson', coords: [27.161832, 77.970727] },
        'Kochi': { path: 'assets/GeoJson/Kochi.geojson', coords: [9.940000, 76.275000] },
        'Banglore': { path: 'assets/GeoJson/Banglre.geojson', coords: [13.135833, 77.607500] },
        'Aizawl': { path: 'assets/GeoJson/Aizawl_Lengpui.geojson', coords: [23.2551083, 92.6203583] },
        'Shillong': { path: 'assets/GeoJson/Shillong.geojson', coords: [25.70361111, 91.97861111] },
        'Bilaspur': { path: 'assets/GeoJson/Bilaspur.geojson', coords: [21.98833333, 82.11111111] },
        'Indore': { path: 'assets/GeoJson/Indore.geojson', coords: [23.72166667, 75.80083333] },
        'Itanagar': { path: 'assets/GeoJson/Itanagar.geojson', coords: [26.9718, 93.643] },
        'Gondia': { path: 'assets/GeoJson/Gondia.geojson', coords: [21.52555556, 80.28916667] },
        'Nashik': { path: 'assets/GeoJson/Nashik.geojson', coords: [20.1194444, 73.9136111] },
        'Jagdalpur': { path: 'assets/GeoJson/Jagdalpur.geojson', coords: [19.07444444, 82.03694444] },
        'Vidyanagar': { path: 'assets/GeoJson/Vidyanagar.geojson', coords: [15.175, 73.6341] },
        'Kalaburagi': { path: 'assets/GeoJson/Kalaburagi.geojson', coords: [17.30777778, 76.95805556] },
        'Moradabad': { path: 'assets/GeoJson/Moradabad.geojson', coords: [28.81944444, 78.92333333] },
        'Pithoragarh': { path: 'assets/GeoJson/Pithoragarh.geojson', coords: [29.5924583, 80.241775] },
        'Rupsi': { path: 'assets/GeoJson/Rupsi.geojson', coords: [26.14111111, 89.90666667] },
        'Salem': { path: 'assets/GeoJson/Salem.geojson', coords: [11.7819444, 78.0644444] },
        'Shivamogga': { path: 'assets/GeoJson/Shivamogga.geojson', coords: [13.85472222, 75.61055556] },
        'Sindhudurg': { path: 'assets/GeoJson/Sindhudurg.geojson', coords: [16.0, 73.5333333] },
        'Tezu': { path: 'assets/GeoJson/Tezu.geojson', coords: [27.9422, 96.1339] },
        'Angul': { path: 'assets/GeoJson/Angul.geojson', coords: [20.91055556, 85.03527778] },
        'Koppal': { path: 'assets/GeoJson/Koppal.geojson', coords: [15.3593111, 76.2192] },
        'Beas': { path: 'assets/GeoJson/Beas.geojson', coords: [31.56055556, 75.34111111] },
        'Hosur': { path: 'assets/GeoJson/Hosur.geojson', coords: [12.66111111, 77.76694444] },
        'Raigarh': { path: 'assets/GeoJson/Raigarh.geojson', coords: [21.82388889, 83.36027778] },
        'Puttaparthi': { path: 'assets/GeoJson/Puttaparthi.geojson', coords: [14.14916667, 77.79111111] },
      };
 
      const airportInfo = airportData[selectedAirportCITY];
      if (airportInfo) {
        this.airportCoordinates = airportInfo.coords;
        map.setView(this.airportCoordinates, zoomLevel);
 
        // Load the GeoJSON file using the path
        fetch(airportInfo.path)
          .then(response => response.json())
          .then(geojsonData => {
            const features = geojsonData.features;
            const style = (feature: any) => {
              const color = feature.properties.Color;
              return { fillColor: color, weight: 2 };
            };
            const geojsonLayer = L.geoJSON(features, { style: style });
            geojsonLayer.addTo(map);
            this.geojsonLayer = geojsonLayer;
            map.fitBounds(geojsonLayer.getBounds());
            let customIcon = L.icon({
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
          })
          .catch(error => {
 
 
          });
      }
    }
  }
 
 
 updateNearestAirportData() {
    const nearestAirport = this.findNearestAirport(this.lat, this.long, 30);
    const selectionMode = this.TopElevationForm.get('selectionMode')?.value;
 
    if (!nearestAirport) {
      // this.toastr.info('Nearest airport data not found.');
      return;
    }
 
    const geojsonFilePath = `assets/GeoJson/${nearestAirport.airportCity}.geojson`;
 
    // Reset error flag and clear previous messages
    this.isGeoJSONNotFound = false;
 
    // Remove existing layers and markers
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
        return response.json();
      })
      .then(geojsonData => {
        this.loadNearestAirportGeoJSON(nearestAirport.airportCity, nearestAirport.distance, this.map);
 
        // Update the form if not in manual mode
        if (selectionMode !== 'manual') {
          this.TopElevationForm.patchValue({
            CITY: nearestAirport.airportCity,
            AIRPORT_NAME: nearestAirport.airportName,
            elevation: this.getElevationForCity(nearestAirport.airportCity)
          });
        }
      })
      .catch(error => {
 
        console.error('Error loading GeoJSON file:', error);
      });
  }
 
  loadNearestAirportGeoJSON(airportCity: string, distance: number, map: any) {
    const airportGeoJSONPath = `assets/GeoJson/${airportCity}.geojson`;
 
    // Reset the error flag before fetching
    this.isGeoJSONNotFound = false;
 
    // Ensure that fetching is handled safely to avoid triggering errors
    if (this.isFetchingGeoJSON) {
      return;
    }
 
    this.isFetchingGeoJSON = true;
 
    // Remove existing layers and markers
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
 
    fetch(airportGeoJSONPath)
      .then(response => {
        if (!response.ok) {
          this.isGeoJSONNotFound = true;
          throw new Error('GeoJSON file not found');
        }
        return response.json();
      })
      .then(geojsonData => {
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
      })
      .catch(error => {
        if (this.isGeoJSONNotFound) {
          Swal.fire({
            html: `The <span style="color: red;">${airportCity}</span> airport does not have a published CCZM map. Please contact Cognitive Navigation for further assistance.`,
            icon: 'warning',
          });
        }
        console.error("Error fetching GeoJSON data:", error);
      })
      .finally(() => {
        this.isFetchingGeoJSON = false;
      });
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
    const RozarpayOptions = {
      key: 'rzp_test_IScA4BP8ntHVNp',
      // key: 'rzp_live_7iwvKtQ79rijv2',
      amount: 50 * 100,
      currency: 'INR',
      name: 'Cognitive Navigation Pvt. Ltd',
      description: ` Plan Subscription`,
      image: 'https://imgur.com/a/J4UAMhv',
      handler: (response: any) => {
        this.router.navigate(['TransactionDetails']);
        const paymentDetails = {
          user_id: this.apiservice.userData.id,
          subscription_type: 'OneTime',
          price: 50,
          razorpay_payment_id: response.razorpay_payment_id,
          expiry_date: new Date().toISOString(),
        };
        const headers = new HttpHeaders().set("Authorization", `Bearer ${this.apiservice.token}`);
        this.http.post('http://localhost:3001/api/subscription/addSubscription', paymentDetails, { headers: headers })
          .subscribe(
            (result: any) => {
              this.createNocas(result.subscription_id)
            },
            (error: any) => {
              console.error('Error storing payment details:', error);
            }
          );
        const confirmation = confirm("Payment Successfully Done. If you want to see payment details, please go to Transaction Details page");
        if (confirmation) {
          this.isSubscribed = true
        }
        this.router.navigate(['C_NOCAS-MAP']);
        const airportCITY = this.TopElevationForm.get('CITY')?.value;
        const latitude = parseFloat(this.TopElevationForm.get('Latitude')?.value);
        const longitude = parseFloat(this.TopElevationForm.get('Longitude')?.value);
        if (airportCITY && !isNaN(latitude) && !isNaN(longitude)) {
          this.updateMarkerPosition();
          this.displayMapData(latitude, longitude, this.airportCoordinates);
          this.closeModal('airportModal')
        }
      },
      theme: {
        color: '#528FF0'
      },
      payment_method: {
        external: ['upi']
      }
    };
    const rzp = new Razorpay(RozarpayOptions);
    rzp.open();
    rzp.on('payment.success', (response: any) => {
    });
    rzp.on('payment.error', (error: any) => {
      alert("Payment Failed");
    });
  }
 
  airportCoordinatesList: Array<[number, number, string, string]> = [
    [19.79, 85.75, 'Puri', 'PURI AIRPORT/Puri/BBI'],
    [19.09155556, 72.86597222, 'Mumbai', 'Chhatrapati Shivaji Maharaj International Airport/Mumbai/BOM'],
    [11.02691111, 77.04180278, 'Coimbatore', 'Coimbatore Airport/Coimbatore/CJB'],
    [23.07119167, 72.62643333, 'Ahemdabad', 'Sardar Vallabhbhai Patel International Airport/Ahemdabad/AMD'],
    [20.69851583, 77.05776056, 'Akola', 'Akola Airport/Akola/AKD'],
    [12.99510000, 80.17360278, 'Chennai', 'Chennai International Airport/Chennai/MAA'],
    [28.61, 77.20, 'Delhi', 'Indira Gandhi International Airport/Delhi/DEL'],
    [26.10502222, 91.58543889, 'Guwahati', 'Lokpriya Gopinath Bordoloi International Airport/Guwahati/GAU'],
    [17.24055556, 78.42888889, 'Hyderabad', 'Rajiv Gandhi International Airport/Hyderabad/HYD'],
    [26.82417278, 75.80247833, 'Jaipur', 'Jaipur International Airport/Jaipur/JAI'],
    [21.09172500, 79.04819722, 'Nagpur', 'Dr. Babasaheb Ambedkar International Airport/Nagpur/NAG'],
    [8.49319444, 76.90915833, 'Thiruvananthapuram', 'Trivandrum International Airport/Thiruvananthapuram/TRV'],
    [22.33004167, 73.21884444, 'Vadodara', 'Vadodara Airport/Vadodara/BDQ'],
    [25.45121111, 82.85860556, 'Varanasi', 'Lal Bahadur Shastri International Airport/Varanasi/VNS'],
    [10.82421944, 72.17663611, 'Agatti', 'Agatti Airport/Agatti Island/AGX'],
    [27.86130000, 78.14706944, 'Aligarh', 'Aligarh Airport/Aligarh/IXC'],
    [22.99345833, 83.19275222, 'Ambikapur', 'Ambikapur Airport/Ambikapur/VER'],
    [31.71059167, 74.80015556, 'Amritsar', 'Sri Guru Ram Dass Jee International Airport/Amritsar/ATQ'],
    [19.86439444, 75.39756111, 'Aurangabad', 'Aurangabad Airport/Aurangabad/IXU'],
    [26.15734917, 83.11402361, 'Azamgarh', 'Azamgarh Airport/Azamgarh/AZH'],
    [25.26355000, 88.79562750, 'Balurghat', 'Balurghat Airport/Balurghat/RGH'],
    [18.22662222, 74.58969722, 'Baramati', 'Baramati Airport/Baramati/'],
    [15.85840278, 74.61769167, 'Belgaum', 'Belgaum Airport/Belgaum/IXG'],
    [19.29156278, 84.87916861, 'Berhampur', 'Berhampur Airport/Berhampur/QBM'],
    [13.19887167, 77.70547778, 'Bial', 'Kempegowda International Airport/Bial/BLR'],
    [23.64352944, 86.14964472, 'Bokaro', 'Bokaro Airport/Bokaro/'],
    [10.15, 76.40, 'Cochin', 'Cochin International Airport/Cochin/COK'],
    [24.26777778, 72.20277778, 'Deesa', 'Deesa Airport/Deesa/DDD'],
    [27.48231111, 95.01706389, 'Diburgarh', 'Diburgarh Airport/Diburgarh/DBG'],
    [20.71379444, 70.92288056, 'Diu', 'Diu Airport/Diu/DIU'],
    [23.62444444, 87.24250000, 'Durgapur', 'Durgapur Airport/Durgapur/DGR'],
    [24.74803889, 84.94243611, 'Gaya', 'Gaya Airport/Gaya/GAY'],
    [15.36183889, 75.08436667, 'Hubli', 'Hubli Airport/Hubli/HDI'],
    [24.76431667, 93.89963889, 'Imphal', 'Imphal Airport/Imphal/IMF'],
    [23.18337222, 80.06044444, 'Jabalpur', 'Jabalpur Airport/Jabalpur/JLR'],
    [28.17561111, 77.60624167, 'Jewar', 'Jewar Airport/Jewar/JEW'],
    [21.91481944, 84.04869167, 'Jharsaugada', 'Veer Surendra Sai Airport/Jharsaugada/JRG'],
    [26.29618056, 87.28654722, 'Jogbani', 'Jogbani Airport/Jogbani/JGN'],
    [14.51304722, 78.77219167, 'Kadapa', 'Kadapa Airport/Kadapa/KDP'],
    [23.11220000, 70.10056667, 'Kandla', 'Kandla Airport/Kandla/IXY'],
    [32.16473611, 76.26215556, 'Kangra', 'Kangra Airport/Kangra/DHM'],
    [11.91573056, 75.54572222, 'Kannur', 'Kannur International Airport/Kannur/CCJ'],
    [21.31498889, 70.26913889, 'Keshod', 'Keshod Airport/Keshod/KSD'],
    [24.81983056, 79.91857500, 'Khajuraho', 'Khajuraho Airport/Khajuraho/KUR'],
    [26.60125, 74.81415, 'Kishangarh', 'Kishangarh Airport/Kishangarh/KQH'],
    [31.87681389, 77.15525833, 'Kullu', 'Kullu Airport/Kullu/KUU'],
    [15.71475556, 78.16298611, 'Kurnool', 'Kurnool Airport/Kurnool/KJB'],
    [26.77277778, 83.89527778, 'Kushinagar', 'Kushinagar Airport/Kushinagar/KUN'],
    [24.71647083, 78.41612444, 'Lalitpur', 'Lalitpur Airport/Lalitpur/LTP'],
    [27.29122778, 94.09352778, 'Lilabari', 'Lilabari Airport/Lilabari/LLB'],
    [26.76185278, 80.88342778, 'Lucknow', 'Chaudhary Charan Singh International Airport/Lucknow/LKO'],
    [30.90, 75.85, 'Ludhiana', 'Ludhiana Airport/Ludhiana/UDN'],
    [12.96206111, 74.88978611, 'Mangalore', 'Mangalore Airport/Mangalore/IXE'],
    [28.90489833, 77.67712167, 'Meerut', 'Meerut Airport/Meerut/MRT'],
    [26.12, 85.38, 'Muzaffarpur', 'Muzaffarpur Airport/Muzaffarpur/MUZ'],
    [12.30, 76.65, 'Mysore', 'Mysore Airport/Mysore/IXM'],
    [19.18103861, 77.32254722, 'Nanded', 'Nanded Airport/Nanded/NAN'],
    [27.13, 88.61, 'Pakyong', 'Pakyong Airport/Pakyong/PYK'],
    [29.03214722, 79.47246944, 'Pantnagar', 'Pantnagar Airport /Pantnagar/PGH'],
    [25.59361111, 85.09183333, 'Patna', 'Jay Prakash Narayan International Airport/Patna/PAT'],
    [21.65034583, 69.65880028, 'Porbandar', 'Porbandar Airport/Porbandar/PBD'],
    [17.10944444, 81.81944444, 'Rajamundary', 'Rajamundary Airport/Rajamundary/'],
    [22.25623889, 84.81460833, 'Rourkela', 'Rourkela Airport/Rourkela/ROK'],
    [19.69083333, 74.37166667, 'Shirdi', 'Shirdi Airport/Shirdi/SHD'],
    [17.62765278, 75.93403889, 'Sholapur', 'Sholapur Airport/Sholapur/SOL'],
    [10.765, 78.710, 'Tiruchirapalli', 'Tiruchirapalli International Airport/Tiruchirapalli/TRZ'],
    [13.63296389, 79.54190833, 'Tirupati', 'Tirupati Airport/Tirupati/TIR'],
    [24.61754056, 73.89445972, 'Udaipur', 'Maharana pratap Airport/Udaipur/UDR'],
    [20.09765028, 83.18355250, 'Utkela', 'Utkela Airport/Utkela/UTK'],
    [12.90810639, 79.06714361, 'Vellore', 'Vellore Airport/Vellore/VEL'],
    [17.91703361, 79.59933194, 'Warangal', 'Warangal Airport/Warangal/WAR'],
    [11.13785000, 75.95057222, 'Calicut', 'Calicut Airport/Calicut/CCJ'],
    [23.89055556, 91.23916667, 'Agartala', 'Agartala Airport/Agartala/IXA'],
    [25.88345756, 93.77135750, 'Dimapur', 'Dimapur Airport/Dimapur/DIP'],
    [25.16008333, 75.84783333, 'Kota', 'Kota Airport/Kota/KTU'],
    [9.83500000, 78.08861111, 'Madurai', 'Madurai Airport/Madurai/IXM'],
    [16.66637222, 74.29048056, 'Kolhapur', 'Kolhapur Airport/Kolhapur/KLH'],
    [22.65473944, 88.44672222, 'Kolkata', 'Netaji Subhas Chandra Bose International Airport/Kolkata/CCU'],
    [23.28691944, 77.33696389, 'Bhopal', 'Raja Bhoj Airport/Bhopal/BHO'],
    [15.74249889, 73.86701028, 'Mopa', 'Manohar International Airport/Mopa/MOP'],
    [21.75425139, 72.19052528, 'Bhavnagar', 'Bhavnagar Airport/Bhavnagar/BHU'],
    [30.19063056, 78.18222222, 'Dehradun', 'Dehradun Airport/Dehradun/DED'],
    [29.1833, 75.7167, 'Hirsar', 'Hirsar Airport/Hirsar/HSR'],
    [29.15, 75.73, 'Hisar', 'Hisar Airport/Hisar/HSR'],
    [22.81455417, 86.16901472, 'Jamshedpur', 'Sonari Airport/Jamshedpur/IXW'],
    [24.44637500, 86.71666667, 'Deoghar', 'Deoghar Airport/Deoghar/'],
    [15.82472167, 79.48233389, 'Donakonda', 'Donakonda Airport/Donakonda/DND'],
    [31.08158083, 77.06767694, 'Shimla', 'Shimla Airport/Shimla/'],
    [26.32965556, 89.46711389, 'Cooch Behar', 'Cooch Behar Airport/Cooch Behar/COH'],
    [20.26420972, 85.80248556, 'Bhuvneshwar', 'Biju Patnaik International Airport/Bhuvneshwar/BBI'],
    [8.72229167, 78.02617500, 'Tuticorin', 'Tuticorin Airport/Tuticorin/TCR'],
    [13.19887167, 77.70547778, 'Bengaluru', 'Kempegowda International Airport/Bengaluru/BLR'],
    [18.88055558, 82.55361111, 'Jeypore', 'Jeypore Airport/Jeypore/JYP'],
    [20.96130556, 75.62459722, 'Jalgaon', 'Jalgaon Airport/Jalgaon/JLG'],
    [11.96731944, 79.81143056, 'Puducherry', 'Puducherry Airport/Puducherry/PDY'],
    [21.18100056, 81.73859194, 'Raipur', 'Raipur Airport/Raipur/RPR'],
    [23.31416667, 85.32111111, 'Ranchi', 'Birsa Munda Airport/Ranchi/IXR'],
    [21.11604444, 72.74181944, 'Surat', 'Surat Airport/Surat/STV'],
    [16.533597, 80.803283, 'Vijaywada', 'Vijaywada Airport/Vijaywada/VGA'],
    [23.45, 75.416667, 'Birlamgram', 'Birlamgram Airport/Birlamgram/'],
    [26.7980, 82.2080, 'Ayodhya', 'Ayodhya Airport/Ayodhya/AYD'],
    [25.2320, 80.8250, 'Chitrakoot', 'Chitrakoot Airport/Chitrakoot/CKU'],
 
    [28.707778, 77.358333, 'Ghaziabad', 'Hindon Air Force/Ghaziabad/HDO'],
    [30.370833, 76.817778, 'Ambala', 'Ambala Air Force/Ambala/'],
    [15.3725, 73.831389, 'Goa', 'INS Hansa/Goa/'],
    [18.582222, 73.919722, 'Pune', 'Lohegaon Air Force/Pune/PNQ'],
    [11.013611, 77.159722, 'Cimbatore', 'Sulur Air Force/Cimbatore/'],
    [13.071111, 79.691111, 'Arakkonnam', 'INS Rajali/Arakkonnam/'],
    [26.257222, 73.051667, 'Jodhpur', 'Jodhpur Air Force/Jodhpur/JDH'],
    [34.135833, 77.545278, 'Leh', 'Leh Airport/Leh/IXL'],
    [32.233611, 75.634444, 'Pathankot', 'Pathankot Air Force/Pathankot/IXP'],
    [9.1525, 92.819722, 'Nicobar islands', 'Car Nicobar Air Force/Nicobar islands/CBD'],
    [26.712222, 92.787222, 'Tezpur', 'Tezpur Air Force/Tezpur/TEZ'],
    [10.722222, 79.101389, 'Thanjavur', 'Thanjavur Air Force/Thanjavur/TJV'],
    [27.161832, 77.970727, 'Agra', 'Agra Airport/Agra/AGR'],
    [9.940000, 76.275000, 'Kochi', 'INS Garuda/Kochi/INS'],
    [13.135833, 77.607500, 'Banglore', 'Yelahanka Air Force/Banglore/'],
    [23.2551083, 92.6203583, 'Aizawl', 'Lengpui Airport/Aizawl/LGU'],
    [25.70361111, 91.97861111, 'Shillong', 'Barapani Airport/Shillong/SHL'],
    [21.98833333, 82.11111111, 'Bilaspur', 'Bilaspur Airport/Bilaspur/PAB'],
    [23.72166667, 75.80083333, 'Indore', 'Devi Ahilya Bai Holkar Airport/Indore/IDR'],
    [26.9718, 93.6423, 'Itanagar', 'Donyi Polo Airport/Itanagar/ITE'],
    [21.52555556, 80.28916667, 'Gondia', 'Gondia Airport/Gondia/GOV'],
    [20.1194444, 73.9136111, 'Nashik', 'HAL Ozar Airport/Nashik/ISK'],
    [19.07444444, 82.03694444, 'Jagdalpur', 'Jagdalpur Airport/Jagdalpur/JGB'],
    [15.175, 73.6341, 'Vidyanagar', 'Jindal Vijayanagar Airport/Vidyanagar/VDY'],
    [17.30777778, 76.95805556, 'Kalaburagi', 'Kalaburagi Airport/Kalaburagi/KBX'],
    [28.81944444, 78.92333333, 'Moradabad', 'Moradabad Airport/Moradabad/MOR'],
    [29.5924583, 80.241775, 'Pithoragarh', 'Naini-Saini Airport/Pithoragarh/PGH'],
    [26.14111111, 89.90666667, 'Rupsi', 'Rupsi Airport/Rupsi/RUP'],
    [11.7819444, 78.0644444, 'Salem', 'Salem Airport/Salem/SXV'],
    [13.85472222, 75.61055556, 'Shivamogga', 'Shivamogga Airport/Shivamogga/SIX'],
    [16.0, 73.5333333, 'Sindhudurg', 'Sindhudurg Airport/Sindhudurg/SID'],
    [27.9422, 96.1339, 'Tezu', 'Tezu Airport/Tezu/TEZ'],
    [20.9105556, 85.0352778, 'Angul', 'Angul Airport/Angul/ANJ'],
    [15.3593111, 76.2192, 'Koppal', 'Baldota Koppal Airport/Koppal/KLP'],
    [31.5605556, 75.3411111, 'Beas', 'Beas Airport/Beas/BEX'],
    [12.6611111, 77.7669444, 'Hosur', 'Hosur Airport/Hosur/HOS'],
    [21.8238889, 83.3602778, 'Raigarh', 'JSPL Raigarh Airport/Raigarh/RIG'],
    [14.1491667, 77.7911111, 'Puttaparthi', 'Sri Satya Sai Airport/Puttaparthi/PXI']
 
  ];
 
  getElevationForCity(city: string): number {
 
    const cityElevationMap: { [key: string]: number } = {
      'Puri': this.feetToMeters(0),
      'Mumbai': this.feetToMeters(40),
      'Coimbatore': this.feetToMeters(10),
      'Ahemdabad': this.feetToMeters(189),
      'Akola': this.feetToMeters(0),
      'Chennai': this.feetToMeters(54),
      'Delhi': this.feetToMeters(778),
      'Guwahati': this.feetToMeters(163),
      'Hyderabad': this.feetToMeters(0),
      'Jaipur': this.feetToMeters(1268),
      'Nagpur': this.feetToMeters(1033),
      'Thiruvananthapuram': this.feetToMeters(17),
      'Vadodara': this.feetToMeters(131),
      'Varanasi': this.feetToMeters(270),
      'Agatti': this.feetToMeters(12),
      'Aligarh': 0,
      'Ambikapur': 0,
      'Amritsar': this.feetToMeters(760),
      'Aurangabad': this.feetToMeters(1917),
      'Azamgarh': 0,
      'Balurghat': 0,
      'Baramati': 0,
      'Belgaum': 0,
      'Berhampur': 0,
      'Bial': this.feetToMeters(0),
      'Bokaro': 0,
      'Cochin': this.feetToMeters(30),
      'Deesa': 0,
      'Dibrugarh': this.feetToMeters(360),
      'Diu': this.feetToMeters(0),
      'Durgapur': this.feetToMeters(302),
      'Gaya': this.feetToMeters(383),
      'Hisar': this.feetToMeters(701),
      'Hubli': this.feetToMeters(2195),
      'Imphal': this.feetToMeters(2544),
      'Jabalpur': this.feetToMeters(1626),
      'Jewar': 0,
      'Jharsaugada': this.feetToMeters(757),
      'Jogbani': 0,
      'Kadapa': this.feetToMeters(444),
      'Kandla': this.feetToMeters(97),
      'Kangra': this.feetToMeters(2527),
      'Kannur': this.feetToMeters(344),
      'Keshod': this.feetToMeters(168),
      'Khajuraho': this.feetToMeters(731),
      'Kishangarh': this.feetToMeters(1478),
      'Kullu': this.feetToMeters(3571),
      'Kurnool': this.feetToMeters(1129),
      'Kushinagar': this.feetToMeters(263),
      'Lalitpur': this.feetToMeters(0),
      'Lilabari': this.feetToMeters(331),
      'Lucknow': this.feetToMeters(406),
      'Ludhiana': this.feetToMeters(0),
      'Mangalore': this.feetToMeters(318),
      'Meerut': this.feetToMeters(0),
      'Muzaffarpur': this.feetToMeters(0),
      'Mysore': this.feetToMeters(2397),
      'Nanded': this.feetToMeters(0),
      'Pakyong': this.feetToMeters(0),
      'Pantnagar': this.feetToMeters(772),
      'Patna': this.feetToMeters(175),
      'Porbandar': this.feetToMeters(26),
      'Rajahmundry': this.feetToMeters(156),
      'Rourkela': this.feetToMeters(673),
      'Shirdi': this.feetToMeters(1938),
      'Sholapur': this.feetToMeters(0),
      'Tiruchirapalli': this.feetToMeters(0),
      'Tirupati': this.feetToMeters(352),
      'Udaipur': this.feetToMeters(1690),
      'Utkela': this.feetToMeters(0),
      'Vellore': this.feetToMeters(0),
      'Warangal': this.feetToMeters(0),
      'Calicut': this.feetToMeters(343),
      'Agartala': this.feetToMeters(56),
      'Dimapur': this.feetToMeters(493),
      'Kota': this.feetToMeters(0),
      'Madurai': this.feetToMeters(466),
      'Kolhapur': this.feetToMeters(2001),
      'Kolkata': this.feetToMeters(0),
      'Bhopal': this.feetToMeters(1721),
      'Mopa': this.feetToMeters(564),
      'Bhavnagar': this.feetToMeters(43),
      'Dehradun': this.feetToMeters(1857),
      'Hirsar': this.feetToMeters(0),
      'Jamshedpur': this.feetToMeters(481),
      'Deoghar': this.feetToMeters(802),
      'Donakonda': this.feetToMeters(0),
      'Shimla': this.feetToMeters(5073),
      'Cooch Behar': this.feetToMeters(141),
      'Bhubaneswar': this.feetToMeters(141),
      'Tuticorin': this.feetToMeters(85),
      'Bengaluru': this.feetToMeters(3002),
      'Jeypore': this.feetToMeters(0),
      'Jalgaon': this.feetToMeters(842),
      'Puducherry': this.feetToMeters(141),
      'Raipur': this.feetToMeters(1044),
      'Ranchi': this.feetToMeters(2150),
      'Surat': this.feetToMeters(25),
      'Vijaywada': this.feetToMeters(83),
      'Birlagram': 0,
      'Ayodhya': this.feetToMeters(329),
      'Chitrakoot': this.feetToMeters(0),
      'Ghaziabad': this.feetToMeters(200),
      'Ambala': this.feetToMeters(275),
      'Goa': this.feetToMeters(15),
      'Pune': this.feetToMeters(560),
      'Cimbatore': this.feetToMeters(410),
      'Arakkonnam': this.feetToMeters(75),
      'Jodhpur': this.feetToMeters(230),
      'Leh': this.feetToMeters(3500),
      'Pathankot': this.feetToMeters(300),
      'Nicobar islands': this.feetToMeters(1),
      'Tezpur': this.feetToMeters(70),
      'Thanjavur': this.feetToMeters(60),
      'Agra': this.feetToMeters(171),
      'Kochi': this.feetToMeters(2),
      'Banglore': this.feetToMeters(920),
      'Aizawl': this.feetToMeters(1390),
      'Shillong': this.feetToMeters(2900),
      'Bilaspur': this.feetToMeters(899),
      'Indore': this.feetToMeters(1850),
      'Itanagar': this.feetToMeters(390),
      'Gondia': this.feetToMeters(1000),
      'Nashik': this.feetToMeters(2000),
      'Jagdalpur': this.feetToMeters(1800),
      'Vidyanagar': this.feetToMeters(510),
      'Kalaburagi': this.feetToMeters(1562),
      'Moradabad': this.feetToMeters(615),
      'Pithoragarh': this.feetToMeters(5000),
      'Rupsi': this.feetToMeters(127),
      'Salem': this.feetToMeters(968),
      'Shivamogga': this.feetToMeters(1847),
      'Sindhudurg': this.feetToMeters(0),
      'Tezu': this.feetToMeters(710),
      'Angul': this.feetToMeters(690),
      'Koppal': this.feetToMeters(1635),
      'Beas': this.feetToMeters(750),
      'Hosur': this.feetToMeters(2900),
      'Raigarh': this.feetToMeters(750),
      'Puttaparthi': this.feetToMeters(1600)
    };
    return cityElevationMap[city] || 0;
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
 
  onElevationOptionChange() {
    const elevationOption = this.TopElevationForm.get('elevationOption')?.value;
    const selectedCity = this.TopElevationForm.get('CITY')?.value;
 
    if (elevationOption === 'default' && selectedCity) {
      const elevation = this.getElevationForCity(selectedCity);
      const defaultElevation = this.feetToMeters(elevation);
      this.TopElevationForm.patchValue({ Site_Elevation: defaultElevation });
 
      this.toastr.info(`Elevation updated based on the selected city (${selectedCity}).`);
    } else if (elevationOption === 'manual') {
      // Optionally, you can clear or set a default value
      this.TopElevationForm.patchValue({ Site_Elevation: '' });
    }
  }
 
 
  async createNocas(subscription_id: string = "") {
    if (this.TopElevationForm.valid) {
 
      const screenshotPath = await this.captureScreenshot();
      const lat = parseFloat(this.TopElevationForm.value.Latitude); const lng = parseFloat(this.TopElevationForm.value.Longitude); const distance = this.calculateDistance(this.lat, this.long, this.airportCoordinates[0], this.airportCoordinates[1]); const clickedFeature = this.geojsonLayer.getLayers().find((layer: any) => { return layer.getBounds().contains([lat, lng]); }); let elevation = 0; let permissibleHeight = 0; if (clickedFeature) { const properties = clickedFeature.feature.properties; elevation = parseFloat(properties.name); permissibleHeight = elevation - parseFloat(this.TopElevationForm.get('Site_Elevation').value); } const requestBody = { user_id: this.apiservice.userData.id, distance: this.insideMapData?.newDistance || (distance.toFixed(2)), permissible_elevation: this.insideMapData?.elevation + "" || elevation + "", permissible_height: this.insideMapData?.permissibleHeight || (permissibleHeight < 0 ? '-' : Math.abs(permissibleHeight).toFixed(2)), city: this.TopElevationForm.value.CITY, latitude: this.insideMapData?.latitudeDMS || this.latitudeDMS, longitude: this.insideMapData?.longitudeDMS || this.longitudeDMS, airport_name: this.selectedAirportName, site_elevation: this.TopElevationForm.value.Site_Elevation, snapshot: screenshotPath, subscription_id: subscription_id, }; this.apiservice.createNocas(requestBody).subscribe((resultData: any) => { if (resultData.isSubscribed || resultData.freeTrialCount > 0 || resultData.isOneTimeSubscription) { this.isSubscribed = true; } else { this.isSubscribed = false; } }, (error: any) => { alert("Session Expired. Please Login again."); localStorage.removeItem('userData'); localStorage.removeItem('token'); this.router.navigate(['UsersLogin']); });
    } else { alert("Please fill out all required fields in the form."); }
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
    (this.distance, "jwse")
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
          // console.error('Error getting user location:', error);
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
          // Sort the airports data by airport_city in ascending order
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
    // Apply negative sign if direction is South or West
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
 
 
 
    // Automatically set the service2 checkbox to true
    this.requestForm.patchValue({
      service2: true
    });
 
    // Now, submit the form
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
          // this.toastr.success("Request created successfully");
          // Optionally, navigate to another page or perform additional actions here
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
 
