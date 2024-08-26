import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as L from 'leaflet';
import { ApiService } from '../Shared/Api/api.service';
import { Router } from '@angular/router';
import * as domtoimage from 'dom-to-image';
declare var Razorpay: any;
import { ToastrService } from 'ngx-toastr';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
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

  constructor(private toastr: ToastrService, public apiservice: ApiService, private formbuilder: FormBuilder, private http: HttpClient, private router: Router) { }

  _filterAirports(value: string): any[] {
    const filterValue = value.toLowerCase();
    const filtered = this.airports.filter(airport => airport.airport_city.toLowerCase().includes(filterValue));
    console.log(filtered); // Check if the filtered list is being populated
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
  }

  initializeForm() {
    this.TopElevationForm = this.formbuilder.group({
      Latitude: [
        this.latitudeDMS,
        [
          Validators.required,
          Validators.pattern(/^([0-8]?\d)°([0-5]?\d)'([0-5]?\d(\.\d+)?)"([NS])$/)
        ]
      ],
      Longitude: [
        this.longitudeDMS,
        [
          Validators.required,
          Validators.pattern(/^([0-8]?\d)°([0-5]?\d)'([0-5]?\d(\.\d+)?)"([EW])$/)
        ]
      ],
      CITY: [''],
      location: [''],
      elevationOption: ['', Validators.required],
      Site_Elevation: [null, [Validators.required, Validators.min(0), Validators.max(9999)]],
      snapshot: [''],
      airportName: [''],
      selectionMode: ['']
    });
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
      this.updateMarkersPosition(lat, this.long);
    });
    this.TopElevationForm.get('Longitude').valueChanges.subscribe((longitudeDMS: string) => {
      const lng = this.convertDMSStringToDD(longitudeDMS);
      this.updateMarkersPosition(this.lat, lng);
    });
  }

  handleCityChanges() {
    this.TopElevationForm.get('CITY').valueChanges.subscribe((city: string) => {
      this.city = city;
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

  loadGeoJSON(map: any, zoomLevel: number = 10) {
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
    if (selectedAirportCITY) {
      let airportGeoJSONPath: string;
      switch (selectedAirportCITY) {
        case 'Puri':
          airportGeoJSONPath = 'assets/GeoJson/Puri.geojson';
          this.airportCoordinates = [19.81, 85.83];
          break;
        case 'Mumbai':
          airportGeoJSONPath = 'assets/GeoJson/Mumbai.geojson';
          this.airportCoordinates = [19.09155556, 72.86597222];
          break;
        case 'Coimbatore':
          airportGeoJSONPath = 'assets/GeoJson/Coimbatore.geojson';
          this.airportCoordinates = [11.02691111, 77.04180278];
          break;
        case 'Ahemdabad':
          airportGeoJSONPath = 'assets/GeoJson/Ahemdabad.geojson';
          this.airportCoordinates = [23.07119167, 72.62643333];
          break;
        case 'Akola':
          airportGeoJSONPath = 'assets/GeoJson/Akola.geojson';
          this.airportCoordinates = [20.69851583, 77.05776056];
          break;
        case 'Chennai':
          airportGeoJSONPath = 'assets/GeoJson/Chennai.geojson';
          this.airportCoordinates = [12.99510000, 80.17360278];
          break;
        case 'Delhi':
          airportGeoJSONPath = 'assets/GeoJson/Delhi.geojson';
          this.airportCoordinates = [28.61, 77.20];
          break;
        case 'Guwahati':
          airportGeoJSONPath = 'assets/GeoJson/Guwahati.geojson';
          this.airportCoordinates = [26.10502222, 91.58543889];
          break;
        case 'Hyderabad':
          airportGeoJSONPath = 'assets/GeoJson/Hydrabad.geojson';
          this.airportCoordinates = [17.38, 78.48];
          break;
        case 'Jaipur':
          airportGeoJSONPath = 'assets/GeoJson/Jaipur.geojson';
          this.airportCoordinates = [26.82417278, 75.80247833];
          break;
        case 'Nagpur':
          airportGeoJSONPath = 'assets/GeoJson/Nagpur.geojson';
          this.airportCoordinates = [21.09172500, 79.04819722];
          break;
        case 'Thiruvananthapuram':
          airportGeoJSONPath = 'assets/GeoJson/Trivendrum.geojson';
          this.airportCoordinates = [8.49319444, 76.90915833];
          break;
        case 'Vadodara':
          airportGeoJSONPath = 'assets/GeoJson/Vadodara.geojson';
          this.airportCoordinates = [22.33004167, 73.21884444];
          break;
        case 'Varanasi':
          airportGeoJSONPath = 'assets/GeoJson/Varanasi.geojson';
          this.airportCoordinates = [25.45121111, 82.85860556];
          break;
        case 'Agatti':
          airportGeoJSONPath = 'assets/GeoJson/Agatti.geojson';
          this.airportCoordinates = [10.82421944, 72.17663611];
          break;
        case 'Aligarh':
          airportGeoJSONPath = 'assets/GeoJson/Aligarh.geojson';
          this.airportCoordinates = [27.86130000, 78.14706944];
          break;
        case 'Ambikapur':
          airportGeoJSONPath = 'assets/GeoJson/Ambikapur.geojson';
          this.airportCoordinates = [22.99345833, 83.19275222];
          break;
        case 'Amritsar':
          airportGeoJSONPath = 'assets/GeoJson/Amritsar.geojson';
          this.airportCoordinates = [31.71059167, 74.80015556];
          break;
        case 'Aurangabad':
          airportGeoJSONPath = 'assets/GeoJson/Aurangabad.geojson';
          this.airportCoordinates = [19.86439444, 75.39756111];
          break;
        case 'Azamgarh':
          airportGeoJSONPath = 'assets/GeoJson/Azamgarh.geojson';
          this.airportCoordinates = [26.15734917, 83.11402361];
          break;
        case 'Balurghat':
          airportGeoJSONPath = 'assets/GeoJson/Balurghat.geojson';
          this.airportCoordinates = [25.26355000, 88.79562750];
          break;
        case 'Baramati':
          airportGeoJSONPath = 'assets/GeoJson/Baramati.geojson';
          this.airportCoordinates = [18.22662222, 74.58969722];
          break;
        case 'Belgaum':
          airportGeoJSONPath = 'assets/GeoJson/Belgaum.geojson';
          this.airportCoordinates = [15.85840278, 74.61769167];
          break;
        case 'Berhampur':
          airportGeoJSONPath = 'assets/GeoJson/Berhampur.geojson';
          this.airportCoordinates = [19.29156278, 84.87916861];
          break;
        case 'Bial':
          airportGeoJSONPath = 'assets/GeoJson/Bial.geojson';
          this.airportCoordinates = [13.19887167, 77.70547778];
          break;
        case 'Bokaro':
          airportGeoJSONPath = 'assets/GeoJson/Bokaro.geojson';
          this.airportCoordinates = [23.64352944, 86.14964472];
          break;
        case 'Cochin':
          airportGeoJSONPath = 'assets/GeoJson/Cochin.geojson';
          this.airportCoordinates = [10.15, 76.40];
          break;
        case 'Deesa':
          airportGeoJSONPath = 'assets/GeoJson/Deesa.geojson';
          this.airportCoordinates = [24.26777778, 72.20277778];
          break;
        case 'Diburgarh':
          airportGeoJSONPath = 'assets/GeoJson/Diburgarh.geojson';
          this.airportCoordinates = [27.48231111, 95.01706389];
          break;
        case 'Diu':
          airportGeoJSONPath = 'assets/GeoJson/Diu.geojson';
          this.airportCoordinates = [20.71379444, 70.92288056];
          break;
        case 'Durgapur':
          airportGeoJSONPath = 'assets/GeoJson/Durgapur.geojson';
          this.airportCoordinates = [23.62444444, 87.24250000];
          break;
        case 'Gaya':
          airportGeoJSONPath = 'assets/GeoJson/Gaya.geojson';
          this.airportCoordinates = [24.74803889, 84.94243611];
          break;
        case 'Hisar':
          airportGeoJSONPath = 'assets/GeoJson/Hisar.geojson';
          this.airportCoordinates = [29.15, 75.73];
          break;
        case 'Hubli':
          airportGeoJSONPath = 'assets/GeoJson/Hubli.geojson';
          this.airportCoordinates = [15.36183889, 75.08436667];
          break;
        case 'Imphal':
          airportGeoJSONPath = 'assets/GeoJson/Imphal.geojson';
          this.airportCoordinates = [24.76431667, 93.89963889];
          break;
        case 'Jabalpur':
          airportGeoJSONPath = 'assets/GeoJson/Jabalpur.geojson';
          this.airportCoordinates = [23.18337222, 80.06044444];
          break;
        case 'Jewer':
          airportGeoJSONPath = 'assets/GeoJson/Jewer.geojson';
          this.airportCoordinates = [28.17561111, 77.60624167];
          break;
        case 'Jharsaugada':
          airportGeoJSONPath = 'assets/GeoJson/Jharsaugada.geojson';
          this.airportCoordinates = [21.91481944, 84.04869167];
          break;
        case 'Jogbani':
          airportGeoJSONPath = 'assets/GeoJson/Jogbani.geojson';
          this.airportCoordinates = [26.29618056, 87.28654722];
          break;
        case 'Kadapa':
          airportGeoJSONPath = 'assets/GeoJson/Kadapa.geojson';
          this.airportCoordinates = [14.51304722, 78.77219167];
          break;
        case 'Kandla':
          airportGeoJSONPath = 'assets/GeoJson/Kandla.geojson';
          this.airportCoordinates = [23.11220000, 70.10056667];
          break;
        case 'Kangra':
          airportGeoJSONPath = 'assets/GeoJson/Kangra.geojson';
          this.airportCoordinates = [32.16473611, 76.26215556];
          break;
        case 'Kannur':
          airportGeoJSONPath = 'assets/GeoJson/Kannur.geojson';
          this.airportCoordinates = [11.91573056, 75.54572222];
          break;
        case 'Keshod':
          airportGeoJSONPath = 'assets/GeoJson/Keshod.geojson';
          this.airportCoordinates = [21.31498889, 70.26913889];
          break;
        case 'Khajuraho':
          airportGeoJSONPath = 'assets/GeoJson/Khajuraho.geojson';
          this.airportCoordinates = [24.81983056, 79.91857500];
          break;
        case 'Kishangarh':
          airportGeoJSONPath = 'assets/GeoJson/Kishangarh.geojson';
          this.airportCoordinates = [26.60125, 74.81415];
          break;
        case 'Kullu':
          airportGeoJSONPath = 'assets/GeoJson/Kullu.geojson';
          this.airportCoordinates = [31.87681389, 77.15525833];
          break;
        case 'Kurnool':
          airportGeoJSONPath = 'assets/GeoJson/Kurnool.geojson';
          this.airportCoordinates = [15.71475556, 78.16298611];
          break;
        case 'Kushinagar':
          airportGeoJSONPath = 'assets/GeoJson/Kushinagar.geojson';
          this.airportCoordinates = [26.77277778, 83.89527778];
          break;
        case 'Lalitpur':
          airportGeoJSONPath = 'assets/GeoJson/Lalitpur.geojson';
          this.airportCoordinates = [24.71647083, 78.41612444];
          break;
        case 'Lilabari':
          airportGeoJSONPath = 'assets/GeoJson/Lilabari.geojson';
          this.airportCoordinates = [27.29122778, 94.09352778];
          break;
        case 'Lucknow':
          airportGeoJSONPath = 'assets/GeoJson/Lucknow.geojson';
          this.airportCoordinates = [26.76185278, 80.88342778];
          break;
        case 'Ludhiana':
          airportGeoJSONPath = 'assets/GeoJson/Ludiana.geojson';
          this.airportCoordinates = [30.90, 75.85];
          break;
        case 'Mangalore':
          airportGeoJSONPath = 'assets/GeoJson/Manglore.geojson';
          this.airportCoordinates = [12.96206111, 74.88978611];
          break;
        case 'Meerut':
          airportGeoJSONPath = 'assets/GeoJson/Meerut.geojson';
          this.airportCoordinates = [28.90489833, 77.67712167];
          break;
        case 'Muzaffarpur':
          airportGeoJSONPath = 'assets/GeoJson/Muzaffarpur.geojson';
          this.airportCoordinates = [26.12, 85.38];
          break;
        case 'Mysore':
          airportGeoJSONPath = 'assets/GeoJson/Mysore.geojson';
          this.airportCoordinates = [12.30, 76.65];
          break;
        case 'Nanded':
          airportGeoJSONPath = 'assets/GeoJson/Nanded.geojson';
          this.airportCoordinates = [19.18103861, 77.32254722];
          break;
        case 'Pakyong':
          airportGeoJSONPath = 'assets/GeoJson/Packyong.geojson';
          this.airportCoordinates = [27.13, 88.61];
          break;
        case 'Pantnagar':
          airportGeoJSONPath = 'assets/GeoJson/Patanagar.geojson';
          this.airportCoordinates = [29.03214722, 79.47246944];
          break;
        case 'Patna':
          airportGeoJSONPath = 'assets/GeoJson/Patna.geojson';
          this.airportCoordinates = [25.59361111, 85.09183333];
          break;
        case 'Porbandar':
          airportGeoJSONPath = 'assets/GeoJson/Porbandar.geojson';
          this.airportCoordinates = [21.65034583, 69.65880028];
          break;
        case 'Rajamundary':
          airportGeoJSONPath = 'assets/GeoJson/Rajamundary.geojson';
          this.airportCoordinates = [17.10944444, 81.81944444];
          break;
        case 'Rourkela':
          airportGeoJSONPath = 'assets/GeoJson/Rourkela.geojson';
          this.airportCoordinates = [22.25623889, 84.81460833];
          break;
        case 'Shirdi':
          airportGeoJSONPath = 'assets/GeoJson/Shirdi.geojson';
          this.airportCoordinates = [19.69083333, 74.37166667];
          break;
        case 'Sholapur':
          airportGeoJSONPath = 'assets/GeoJson/Sholapur.geojson';
          this.airportCoordinates = [17.62765278, 75.93403889];
          break;
        case 'Tiruchirapalli':
          airportGeoJSONPath = 'assets/GeoJson/Tiruchirapalli.geojson';
          this.airportCoordinates = [10.765, 78.710];
          break;
        case 'Tirupati':
          airportGeoJSONPath = 'assets/GeoJson/Tirupati.geojson';
          this.airportCoordinates = [13.63296389, 79.54190833];
          break;
        case 'Udaipur':
          airportGeoJSONPath = 'assets/GeoJson/Udaipur.geojson';
          this.airportCoordinates = [24.61754056, 73.89445972];
          break;
        case 'Utkela':
          airportGeoJSONPath = 'assets/GeoJson/Utkela.geojson';
          this.airportCoordinates = [20.09765028, 83.18355250];
          break;
        case 'Vellore':
          airportGeoJSONPath = 'assets/GeoJson/Vellore.geojson';
          this.airportCoordinates = [12.90810639, 79.06714361];
          break;
        case 'Warangal':
          airportGeoJSONPath = 'assets/GeoJson/Warangal.geojson';
          this.airportCoordinates = [17.91703361, 79.59933194];
          break;
        case 'Calicut':
          airportGeoJSONPath = 'assets/GeoJson/Calicut.geojson';
          this.airportCoordinates = [11.13785000, 75.95057222];
          break;
        case 'Agartala':
          airportGeoJSONPath = 'assets/GeoJson/Agartala.geojson';
          this.airportCoordinates = [23.89055556, 91.23916667];
          break;
        case 'Dimapur':
          airportGeoJSONPath = 'assets/GeoJson/Dimapur.geojson';
          this.airportCoordinates = [25.88345756, 93.77135750];
          break;
        case 'Kota':
          airportGeoJSONPath = 'assets/GeoJson/Kota.geojson';
          this.airportCoordinates = [25.16008333, 75.84783333];
          break;
        case 'Madurai':
          airportGeoJSONPath = 'assets/GeoJson/Madurai.geojson';
          this.airportCoordinates = [9.83500000, 78.08861111];
          break;
        case 'Kolhapur':
          airportGeoJSONPath = 'assets/GeoJson/Kolhapur.geojson';
          this.airportCoordinates = [16.66637222, 74.29048056];
          break;
        case 'Kolkata':
          airportGeoJSONPath = 'assets/GeoJson/Kolkata.geojson';
          this.airportCoordinates = [22.65473944, 88.44672222];
          break;
        case 'Bhopal':
          airportGeoJSONPath = 'assets/GeoJson/Bhopal.geojson';
          this.airportCoordinates = [23.28691944, 77.33696389];
          break;
        case 'Mopa':
          airportGeoJSONPath = 'assets/GeoJson/Mopa.geojson';
          this.airportCoordinates = [15.74249889, 73.86701028];
          break;
        case 'Bhavnagar':
          airportGeoJSONPath = 'assets/GeoJson/Bhavnagar.geojson';
          this.airportCoordinates = [21.75425139, 72.19052528];
          break;
        case 'Dehradun':
          airportGeoJSONPath = 'assets/GeoJson/Dehradun.geojson';
          this.airportCoordinates = [30.19063056, 78.18222222];
          break;
        case 'Hirsar':
          airportGeoJSONPath = 'assets/GeoJson/Hirsar.geojson';
          this.airportCoordinates = [29.1833, 75.7167];
          break;
        case 'Jamshedpur':
          airportGeoJSONPath = 'assets/GeoJson/Jamshedpur.geojson';
          this.airportCoordinates = [22.81455417, 86.16901472];
          break;
        case 'Deoghar':
          airportGeoJSONPath = 'assets/GeoJson/Deoghar.geojson';
          this.airportCoordinates = [24.44637500, 86.71666667];
          break;
        case 'Donakonda':
          airportGeoJSONPath = 'assets/GeoJson/Donakonda.geojson';
          this.airportCoordinates = [15.82472167, 79.48233389];
          break;
        case 'Shimla':
          airportGeoJSONPath = 'assets/GeoJson/Shimla.geojson';
          this.airportCoordinates = [31.08158083, 77.06767694];
          break;
        case 'Cooch Behar':
          airportGeoJSONPath = 'assets/GeoJson/CoochBehar.geojson';
          this.airportCoordinates = [26.32965556, 89.46711389];
          break;
        case 'Bhuvneshwar':
          airportGeoJSONPath = 'assets/GeoJson/Bhuvneshwar.geojson';
          this.airportCoordinates = [20.26420972, 85.80248556];
          break;
        case 'Tuticorin':
          airportGeoJSONPath = 'assets/GeoJson/Tuticorin.geojson';
          this.airportCoordinates = [8.72229167, 78.02617500];
          break;
        case 'Bengaluru':
          airportGeoJSONPath = 'assets/GeoJson/Banglore.geojson';
          this.airportCoordinates = [13.19887167, 77.70547778];
          break;
        case 'Jeypore':
          airportGeoJSONPath = 'assets/GeoJson/Jaypore.geojson';
          this.airportCoordinates = [18.88055558, 82.55361111];
          break;
        case 'Jalgaon':
          airportGeoJSONPath = 'assets/GeoJson/Jalgoan.geojson';
          this.airportCoordinates = [20.96130556, 75.62459722];
          break;
        case 'Puducherry':
          airportGeoJSONPath = 'assets/GeoJson/Puducherry.geojson';
          this.airportCoordinates = [11.96731944, 79.81143056];
          break;
        case 'Raipur':
          airportGeoJSONPath = 'assets/GeoJson/Raipur.geojson';
          this.airportCoordinates = [21.18100056, 81.73859194];
          break;
        case 'Ranchi':
          airportGeoJSONPath = 'assets/GeoJson/Ranchi.geojson';
          this.airportCoordinates = [23.31416667, 85.32111111];
          break;
        case 'Surat':
          airportGeoJSONPath = 'assets/GeoJson/Surat.geojson';
          this.airportCoordinates = [21.11604444, 72.74181944];
          break;
        case 'Vijaywada':
          airportGeoJSONPath = 'assets/GeoJson/Vijaywada.geojson';
          this.airportCoordinates = [16.533597, 80.803283];
          break;
        case 'Birlamgram':
          airportGeoJSONPath = 'assets/GeoJson/Birlamgram.geojson';
          this.airportCoordinates = [23.45, 75.416667];
          break;
        case 'Ayodhya':
          airportGeoJSONPath = 'assets/GeoJson/Ayodhya.geojson';
          this.airportCoordinates = [26.7980, 82.2080];
          break;
        case 'Chitrakoot':
          airportGeoJSONPath = 'assets/GeoJson/Chitrakoot.geojson';
          this.airportCoordinates = [25.2320, 80.8250];
          break;


        case 'Ghaziabad':
          airportGeoJSONPath = 'assets/GeoJson/Ghaziabad.geojson';
          this.airportCoordinates = [28.707778, 77.358333];
          break;
        case 'Ambala':
          airportGeoJSONPath = 'assets/GeoJson/Ambala.geojson';
          this.airportCoordinates = [30.370833, 76.817778];
          break;
        case 'Goa':
          airportGeoJSONPath = 'assets/GeoJson/Goa.geojson';
          this.airportCoordinates = [15.3725, 73.831389];
          break;
        case 'Pune':
          airportGeoJSONPath = 'assets/GeoJson/Pune.geojson';
          this.airportCoordinates = [18.582222, 73.919722];
          break;
        case 'Cimbatore':
          airportGeoJSONPath = 'assets/GeoJson/Cimbatore.geojson';
          this.airportCoordinates = [11.013611, 77.159722];
          break;
        case 'Arakkonnam':
          airportGeoJSONPath = 'assets/GeoJson/Arakkonnam.geojson';
          this.airportCoordinates = [13.071111, 79.691111];
          break;
        case 'Jodhpur':
          airportGeoJSONPath = 'assets/GeoJson/Jodhpur.geojson';
          this.airportCoordinates = [26.257222, 73.051667];
          break;
        case 'Leh':
          airportGeoJSONPath = 'assets/GeoJson/Leh.geojson';
          this.airportCoordinates = [34.135833, 77.545278];
          break;
        case 'Pathankot':
          airportGeoJSONPath = 'assets/GeoJson/Pathankot.geojson';
          this.airportCoordinates = [32.233611, 75.634444];
          break;
        case 'Nicobar islands':
          airportGeoJSONPath = 'assets/GeoJson/NicobarIslands.geojson';
          this.airportCoordinates = [9.1525, 92.819722];
          break;
        case 'Tezpur':
          airportGeoJSONPath = 'assets/GeoJson/Tezpur.geojson';
          this.airportCoordinates = [26.712222, 92.787222];
          break;
        case 'Thanjavur':
          airportGeoJSONPath = 'assets/GeoJson/Thanjavur.geojson';
          this.airportCoordinates = [10.722222, 79.101389];
          break;
        case 'Agra':
          airportGeoJSONPath = 'assets/GeoJson/Agra.geojson';
          this.airportCoordinates = [27.161832, 77.970727];
          break;
        case 'Kochi':
          airportGeoJSONPath = 'assets/GeoJson/Kochi.geojson';
          this.airportCoordinates = [9.940000, 76.275000];
          break;
        case 'Banglore':
          airportGeoJSONPath = 'assets/GeoJson/Banglre.geojson';
          this.airportCoordinates = [13.135833, 77.607500];
          break;
        case 'Aizawl':
          airportGeoJSONPath = 'assets/GeoJson/Aizawl_Lengpui.geojson';
          this.airportCoordinates = [23.2551083, 92.6203583
          ];
          break;
        case 'Shillong':
          airportGeoJSONPath = 'assets/GeoJson/Shillong.geojson';
          this.airportCoordinates = [25.70361111, 91.97861111];
          break;
        case 'Bilaspur':
          airportGeoJSONPath = 'assets/GeoJson/Bilaspur.geojson';
          this.airportCoordinates = [21.98833333, 82.11111111];
          break;
        case 'Indore':
          airportGeoJSONPath = 'assets/GeoJson/Indore.geojson';
          this.airportCoordinates = [23.72166667, 75.80083333];
          break;
        case 'Itanagar':
          airportGeoJSONPath = 'assets/GeoJson/Itanagar.geojson';
          this.airportCoordinates = [26.9718, 93.643];
          break;
        case 'Gondia':
          airportGeoJSONPath = 'assets/GeoJson/Gondia.geojson';
          this.airportCoordinates = [21.52555556, 80.28916667];
          break;
        case 'Nashik':
          airportGeoJSONPath = 'assets/GeoJson/Nashik.geojson';
          this.airportCoordinates = [20.1194444, 73.9136111];
          break;
        case 'Jagdalpur':
          airportGeoJSONPath = 'assets/GeoJson/Jagdalpur.geojson';
          this.airportCoordinates = [19.07444444, 82.03694444];
          break;
        case 'Vidyanagar':
          airportGeoJSONPath = 'assets/GeoJson/Vidyanagar.geojson';
          this.airportCoordinates = [15.175, 73.6341];
          break;
        case 'Kalaburagi':
          airportGeoJSONPath = 'assets/GeoJson/Kalaburagi.geojson';
          this.airportCoordinates = [17.30777778, 76.95805556];
          break;
        case 'Moradabad':
          airportGeoJSONPath = 'assets/GeoJson/Moradabad.geojson';
          this.airportCoordinates = [28.81944444, 78.92333333];
          break;
        case 'Pithoragarh':
          airportGeoJSONPath = 'assets/GeoJson/Pithoragarh.geojson';
          this.airportCoordinates = [29.5924583, 80.241775];
          break;
        case 'Rupsi':
          airportGeoJSONPath = 'assets/GeoJson/Rupsi.geojson';
          this.airportCoordinates = [26.14111111, 89.90666667];
          break;
        case 'Salem':
          airportGeoJSONPath = 'assets/GeoJson/Salem.geojson';
          this.airportCoordinates = [11.7819444, 78.0644444];
          break;
        case 'Shivamogga':
          airportGeoJSONPath = 'assets/GeoJson/Shivamogga.geojson';
          this.airportCoordinates = [13.85472222, 75.61055556];
          break;
        case 'Sindhudurg':
          airportGeoJSONPath = 'assets/GeoJson/Sindhudurg.geojson';
          this.airportCoordinates = [16.0, 73.5333333];
          break;
        case 'Tezu':
          airportGeoJSONPath = 'assets/GeoJson/Tezu.geojson';
          this.airportCoordinates = [27.9422, 96.1339];
          break;
        case 'Angul':
          airportGeoJSONPath = 'assets/GeoJson/Angul.geojson';
          this.airportCoordinates = [20.91055556, 85.03527778];
          break;
        case 'Koppal':
          airportGeoJSONPath = 'assets/GeoJson/Koppal.geojson';
          this.airportCoordinates = [15.3593111, 76.2192];
          break;
        case 'Beas':
          airportGeoJSONPath = 'assets/GeoJson/Beas.geojson';
          this.airportCoordinates = [31.56055556, 75.34111111];
          break;
        case 'Hosur':
          airportGeoJSONPath = 'assets/GeoJson/Hosur.geojson';
          this.airportCoordinates = [12.66111111, 77.76694444];
          break;
        case 'Raigarh':
          airportGeoJSONPath = 'assets/GeoJson/Raigarh.geojson';
          this.airportCoordinates = [21.82388889, 83.36027778];
          break;
        case 'Puttaparthi':
          airportGeoJSONPath = 'assets/GeoJson/Puttaparthi.geojson';
          this.airportCoordinates = [14.14916667, 77.79111111];
          break;
        default:
          console.error("Invalid airport city name.");
          return;
      }
      fetch(airportGeoJSONPath)
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
          console.error("Error loading GeoJSON:", error);
          this.toastr.warning(
            `The airport selected does not have a CCZM map published by the authorities. Please contact Cognitive Navigation for further assistance.`,
          )
        });
    }
  }

  loadNearestAirportGeoJSON(airportCity: string, distance: number, map: any) {
    const airportGeoJSONPath = `assets/GeoJson/${airportCity}.geojson`;
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
    fetch(airportGeoJSONPath)
      .then(response => response.json())
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
        console.error("Error fetching GeoJSON data:", error);
      })
      .finally(() => {
        this.isFetchingGeoJSON = false;
      });
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
    if (!this.TopElevationForm.valid) {
      return;
    }
    const selectedAirportCITY = this.TopElevationForm.get('CITY')?.value;
    const nearestAirport = this.findNearestAirport(this.lat, this.long, 30);
    const selectionMode = this.TopElevationForm.get('selectionMode')?.value;
    const selectedAirportGeojsonFilePath = `assets/GeoJson/${selectedAirportCITY}.geojson`;
    fetch(selectedAirportGeojsonFilePath)
      .then(response => {
        if (!response.ok) {
          throw new Error("The airport selected does not have a CCZM map published by the authorities. Please contact Cognitive Navigation for further assistance.");
        }
        return response.json();
      })
      .then(() => {
        if (nearestAirport) {
          const nearestAirportGeojsonFilePath = `assets/GeoJson/${nearestAirport.airportCity}.geojson`;
          fetch(nearestAirportGeojsonFilePath)
            .then(response => {
              if (!response.ok) {
                throw new Error('GeoJSON file not found for nearest airport');
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
              if (selectionMode !== 'default' || (nearestAirport && nearestAirport.airportCity === selectedAirportCITY)) {
                const confirmation = confirm("Kindly confirm that the entered site information is correct or verify");
                if (confirmation) {
                  this.captureScreenshot().then(() => {
                    this.createNocas();
                    this.showData();
                  });
                }
              }
            })
            .catch(error => {
              this.toastr.warning(
                `The airport selected does not have a CCZM map published by the authorities. Please contact Cognitive Navigation for further assistance.`
              );
              if (selectionMode !== 'default') {
                const confirmation = confirm("Kindly confirm that the entered site information is correct or verify");
                if (confirmation) {
                  this.captureScreenshot().then(() => {
                    this.createNocas();
                    this.showData();
                  });
                }
              }
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
            this.toastr.info('No airport found within the specified radius.');  // Show toastr message
          }
        }
      })
      .catch(error => {
        this.toastr.warning(`
                    The airport selected does not have a CCZM map published by the authorities. Please contact Cognitive Navigation for further assistance.`
        );
        if (nearestAirport) {
          const nearestAirportGeojsonFilePath = `assets/GeoJson/${nearestAirport.airportCity}.geojson`;

          fetch(nearestAirportGeojsonFilePath)
            .then(response => {
              if (!response.ok) {
                throw new Error('GeoJSON file not found for nearest airport');
              }
              return response.json();
            })
            .then(() => {
              const confirmation = confirm("Kindly confirm that the entered site information is correct or verify");
              if (confirmation) {
                this.captureScreenshot().then(() => {
                  this.createNocas();
                  this.showData();
                });
              }
            })
            .catch(error => {
              this.toastr.warning(`GeoJSON not found for nearest airport (${nearestAirport.airportCity}). Please connect via company email and company numbers for more details.`);
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
      console.log(`Nearest Airport: ${closestAirport.airportName}, Distance: ${closestAirport.distance}`);
    } else {
      const selectionMode = this.TopElevationForm.get('selectionMode')?.value;
      if (selectionMode === 'default') {
        this.toastr.info('No airport found within the specified radius.');  // Show toastr message
      }
    }
    return closestAirport;
  }

  updateMarkersPosition(lat: number, lng: number): void {
    this.lat = lat;
    this.long = lng;
    this.updateMarkerPosition();
  }

  updateMarkerPosition(): void {
    if (this.marker) {
      if (isNaN(this.lat) || isNaN(this.long)) {
        this.latitudeDMS = '';
        this.longitudeDMS = '';
      } else {
        this.latitudeDMS = this.convertDDtoDMS(this.lat, true);
        this.longitudeDMS = this.convertDDtoDMS(this.long, false);
      }
      this.marker.setLatLng([this.lat, this.long]);
      const popupContent = `Site Location : <br> Site Latitude: ${this.latitudeDMS}, Site Longitude: ${this.longitudeDMS}`;
      this.marker.bindPopup(popupContent).openPopup();
    }
  }

  updateNearestAirportData() {
    const nearestAirport = this.findNearestAirport(this.lat, this.long, 30);
    const selectionMode = this.TopElevationForm.get('selectionMode')?.value;
    if (!nearestAirport) {
      this.toastr.info('Nearest airport data not found.');
      return;
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
    const geojsonFilePath = `assets/GeoJson/${nearestAirport.airportCity}.geojson`;
    fetch(geojsonFilePath)
      .then(response => {
        if (!response.ok) {
          throw new Error('GeoJSON file not found');
        }
        return response.json();
      })
      .then(() => {
        if (selectionMode !== 'manual') {
          this.loadNearestAirportGeoJSON(nearestAirport.airportCity, nearestAirport.distance, this.map);

          this.TopElevationForm.patchValue({
            CITY: nearestAirport.airportCity,
            AIRPORT_NAME: nearestAirport.airportName,
            elevation: this.getElevationForCity(nearestAirport.airportCity)
          });
        }
      })
      .catch(error => {
        this.toastr.warning(
          `The airport selected does not have a CCZM map published by the authorities. Please 
  <a (click)="contact()">contact</a> Cognitive Navigation for further assistance.`
        )
        console.error('Error loading GeoJSON file:', error);
        if (selectionMode !== 'manual') {
        }
      });
  }

  navigateToContact() {
    this.router.navigate(['/request-Service']);
  }

  convertDMSStringToDD(dmsString: string): number {
    const parts = dmsString.split(/[^\d\w\.]+/);
    const degrees = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    const direction = parts[3];
    return this.convertDMSsToDD(degrees, minutes, seconds, direction);
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

  convertDDtoDMS(degrees: number, isLatitude: boolean): string {
    const absDegrees = Math.abs(degrees);
    const d = Math.floor(absDegrees);
    const m = Math.floor((absDegrees - d) * 60);
    const s = (absDegrees - d - m / 60) * 3600;
    let formattedSeconds = s.toFixed(2).replace(/\.?0+$/, '');
    if (formattedSeconds === '') {
      formattedSeconds = '0';
    }
    const direction = isLatitude
      ? (degrees >= 0 ? 'N' : 'S')
      : (degrees >= 0 ? 'E' : 'W');
    return `${d}°${m}'${formattedSeconds}"${direction}`;
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
      // key: 'rzp_test_IScA4BP8ntHVNp',
      key: 'rzp_live_7iwvKtQ79rijv2',
      amount: 50 * 100,
      currency: 'INR',
      name: 'Cognitive Navigation Pvt. Ltd',
      description: ` Plan Subscription`,
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZ4mHCqV6RQTwJIAON-ZK6QN9rdxF4YK_fLA&s',
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
        this.http.post('http://ec2-3-142-142-5.us-east-2.compute.amazonaws.com:3001/api/subscription/addSubscription', paymentDetails, { headers: headers })
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
    const elevationOptionControl = this.TopElevationForm.get('elevationOption');
    const city = this.city; // Assuming 'city' is available in your class context
    let defaultElevation = null;

    if (elevationOptionControl && elevationOptionControl.value === 'unknown') {
      // Get elevation for the selected city
      const elevation = this.getElevationForCity(city);

      // Convert the elevation from feet to meters
      defaultElevation = this.feetToMeters(elevation);

      // Update the form with the default elevation
      this.TopElevationForm.patchValue({ Site_Elevation: defaultElevation });

      // Show an alert or notification to the user
      this.showAlert = true;
      this.toastr.info("Users shall enter site elevation value received from WGS-84 survey report. Permissible height will be calculated based on site elevation entered by user. In absence of site elevation value from user, ARP (Airport) elevation value will be used as default.");
    } else {
      // Hide the alert if the value is not 'unknown'
      this.showAlert = false;
    }
  }

  async createNocas(subscription_id: string = "") {
    if (this.TopElevationForm.valid) {
      try {
        const screenshotPath = await this.captureScreenshot();
        const lat = parseFloat(this.TopElevationForm.value.Latitude); const lng = parseFloat(this.TopElevationForm.value.Longitude); const distance = this.calculateDistance(this.lat, this.long, this.airportCoordinates[0], this.airportCoordinates[1]); const clickedFeature = this.geojsonLayer.getLayers().find((layer: any) => { return layer.getBounds().contains([lat, lng]); }); let elevation = 0; let permissibleHeight = 0; if (clickedFeature) { const properties = clickedFeature.feature.properties; elevation = parseFloat(properties.name); permissibleHeight = elevation - parseFloat(this.TopElevationForm.get('Site_Elevation').value); } const requestBody = { user_id: this.apiservice.userData.id, distance: this.insideMapData?.newDistance || (distance.toFixed(2)), permissible_elevation: this.insideMapData?.elevation + "" || elevation + "", permissible_height: this.insideMapData?.permissibleHeight || (permissibleHeight < 0 ? '-' : Math.abs(permissibleHeight).toFixed(2)), city: this.TopElevationForm.value.CITY, latitude: this.insideMapData?.latitudeDMS || this.latitudeDMS, longitude: this.insideMapData?.longitudeDMS || this.longitudeDMS, airport_name: this.selectedAirportName, site_elevation: this.TopElevationForm.value.Site_Elevation, snapshot: screenshotPath, subscription_id: subscription_id, }; this.apiservice.createNocas(requestBody).subscribe((resultData: any) => { if (resultData.isSubscribed || resultData.freeTrialCount > 0 || resultData.isOneTimeSubscription) { this.isSubscribed = true; } else { this.isSubscribed = false; } }, (error: any) => { alert("Session Expired. Please Login again."); localStorage.removeItem('userData'); localStorage.removeItem('token'); this.router.navigate(['UsersLogin']); });
      } catch (error) { alert("Please review your selection. Ensure that the selected airport is correct and that all information is accurate before proceeding."); }
    } else { alert("Please fill out all required fields in the form."); }
  }

  displayMapData(lat: number, lng: number, airportCoordinates: [number, number]) {
    const distance = this.calculateDistance(this.lat, this.long, this.airportCoordinates[0], this.airportCoordinates[1]);
    const clickedFeature = this.geojsonLayer.getLayers().find((layer: any) => {
      return layer.getBounds().contains([this.lat, this.long]);
    });

    if (clickedFeature) {
      const properties = clickedFeature.feature.properties;
      console.log(properties)
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
      console.log("Inside Map Data Updated:", this.insideMapData);

      // Display the insideMapData modal
      this.showModal('insideMapData');
    } else {
      this.handleAirportModalOK();
    }
  }

  updateSelectedAirport(airportCity: string, airportName: string, distance: number) {
    this.airportName = airportName;
    this.distance = distance;
    console.log(this.distance, "jwse")
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
}


