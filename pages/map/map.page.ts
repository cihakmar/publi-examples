import { Component, ElementRef, ViewChild, NgZone } from "@angular/core";
import { ConfigResponse } from "../../../models/configResponse";
import { ProfileResponse } from "../../../models/profileResponse";
import { ProfileHelper } from "../../../models/Extensions/ProfileHelper";
import { TranslateService } from "@ngx-translate/core";
import { CheckCardResponse } from "../../../models/checkCardResponse";
import { VehicleFastResponse } from "../../../models/vehicle/vehiclesFastResponse";
import { AlertController, MenuController, NavController, Platform } from "@ionic/angular";

import * as L from "leaflet";
import "leaflet.markercluster";
import turf from "turf";
import LGeo from "leaflet-geodesy";
import { GeoJsonObject } from "geojson";

import { GeoService } from "../../../services/geo.service";
import { Config } from "../../../../config";
import { EventsService } from "../../../services/events.servise";
import { VehicleService } from "../../../services/vehicle.service";
import { RepositoryService } from "../../../services/repository.service";
import { UtilsService } from "../../../services/utils.service";
import { of, Subscription, timer } from "rxjs";
import { Router } from "@angular/router";
import { ParkingSpot } from "../../../models/parkingSpot";
import { VehicleType } from "../../../models/vehicle/vehicleResponse";
import { FilterTypeEnums } from "../../../models/filterTypeEnums";
import { UserService } from "../../../services/user.service";
import { delayWhen, filter } from "rxjs/operators";

@Component({
    templateUrl: "map.page.html",
    selector: "app-map",
    styleUrls: ["./map.page.scss"]

})
export class MapPage {
    @ViewChild("map") private mapContainer;

    private cluster;
    private clusterParking;
    private clickHandler;
    private iconCar: L.Icon;
    private iconMoto: L.Icon;
    private iconScooter: L.Icon;
    private iconKickScooter: L.Icon;
    private iconMe: L.Icon;
    private iconYou: L.Icon;
    private iconParkingSpot: L.Icon;
    private map;
    private markers = [];
    public loading = false;
    public loaded = false;
    public vehicles: VehicleFastResponse[] = [];
    public vehicleBorrowed: VehicleFastResponse;
    private vehicleFilterAlert: HTMLIonAlertElement;
    public profile: ProfileResponse;
    public types = [];
    public location: Location;
    public vehicleTypes: any[] = [];
    private config: ConfigResponse;
    public version: string;
    public versionCode: string;
    public lastMapOptions = null;
    public checkCardResponse: CheckCardResponse;
    public parkingSpots: Array<ParkingSpot>;
    public parkingSpotsType: number;

    backButtonSubscription: Subscription;
    locationOnSubscription: Subscription;
    locationOffSubscription: Subscription;
    positionSubscription: Subscription;

    public constructor(
        public geoSrv: GeoService,
        public platform: Platform,
        public configuration: Config,
        public zone: NgZone,
        public alertCtrl: AlertController,
        public eventsSrv: EventsService,
        public translateSrv: TranslateService,
        private vehicleSrv: VehicleService,
        private menuCtrl: MenuController,
        private navCtrl: NavController,
        private repoSrv: RepositoryService,
        private utilsSrv: UtilsService,
        private elementRef: ElementRef,
        private router: Router,
        public userSvc: UserService
    ) {
        this.locationOffSubscription = this.eventsSrv.getLocationOffEvent().subscribe(async data => {
            this.zone.run(() => {
                this.geoSrv.available = false;
            });
        });
        this.locationOnSubscription = this.eventsSrv.getLocationOnEvent().subscribe(async data => {
            this.zone.run(() => {
                this.geoSrv.available = true;
            });
        });
        this.backButtonSubscription = this.eventsSrv.getBackButtonEvent().subscribe(async data => {
            if (this.vehicleFilterAlert) {
                await this.vehicleFilterAlert.dismiss();
            } else {
                navigator["app"].exitApp();
            }
        });

        this.createIcons();
    }

    public async getSettings(): Promise<void> {
        this.version = this.configuration.version;
        this.versionCode = this.configuration.versionCode;
        if (this.config && this.config.version_info && this.version) {
            try {
                await this.utilsSrv.checkVersion(this.version, this.config.version_info);
            } catch (e) {
                console.log("CHECK VERSION WAS NOT SUCCESSFUL", e);
            }
        }
    }

    public async reload(): Promise<void> {
        this.loaded = false;
        this.lastMapOptions = {
            zoom: this.map && this.map.getZoom(),
            coord: this.map && this.map.getCenter()
        };
        this.map.remove();
        await this.ionViewWillEnter();
    }

    public listenForPositionChanges() {
        let myPoint;
        this.positionSubscription = this.geoSrv.currentPosition$.pipe(
            delayWhen(() => {
                return timer(this.map ? 0 : 1000); // delay first render
            })
        ).subscribe(pos => {
            if (myPoint) {
                myPoint.removeFrom(this.map);
            }

            const myPosition = L.latLng(pos.lat, pos.lng);
            myPoint = L.marker(myPosition, { draggable: false, icon: this.iconMe }) // cerveny
                .addTo(this.map);
            // this.markers.push(myPoint); >>>> Why is this needed?<<<<
        });
    }

    public async load(): Promise<void> {
        this.loading = true;
        try {
            this.geoSrv.init();
            this.zone.run(() => {
                this.cluster = L.markerClusterGroup({
                    showCoverageOnHover: false,

                    maxClusterRadius: (zoom) => {
                        return zoom <= 14 ? 80 : 20; // radius in pixels
                    },
                    iconCreateFunction: (cluster) => {
                        return L.divIcon({
                            iconSize: new L.Point(40, 40),
                            html:
                                `<div class="marker-cluster"><p>` +
                                cluster.getChildCount() +
                                `</p><img src="assets/marker_cluster.svg" alt=""></div>`
                        });
                    }
                });
                this.clusterParking = L.markerClusterGroup({
                    showCoverageOnHover: false,

                    maxClusterRadius: (zoom) => {
                        return zoom <= 14 ? 30 : 10; // radius in pixels
                    },
                    iconCreateFunction: (clusterParking) => {
                        return L.divIcon({
                            iconSize: new L.Point(40, 40),
                            html:
                                `<div class="marker-cluster marker-cluster--spots"><p>` +
                                clusterParking.getChildCount() +
                                `</p><img src="assets/marker_cluster_spots.svg" alt=""></div>`
                        });
                    }
                });

                this.markers.forEach((marker) => {
                    this.map.removeLayer(marker);
                });
                if (this.vehicleBorrowed) {
                    const marker = L.marker(L.latLng(this.vehicleBorrowed.lat, this.vehicleBorrowed.lng), {
                        draggable: false,
                        icon: this.iconYou,
                        interactive: true,
                        opacity: 1
                    }).on("click", (mapMarker) => {
                        this.onMarkerClicked(
                            mapMarker,
                            this.vehicleBorrowed.id,
                            true,
                            true,
                            true,
                            this.vehicleBorrowed.vehicle_type
                        );
                    });
                    this.map.addLayer(marker);
                }
                this.vehicles.forEach((vehicle, index) => {
                    const point = L.latLng(vehicle.lat, vehicle.lng);
                    let vehicleLink = false;
                    const vehicleLinkYou = false;
                    let vehicleIcon = this.iconCar;
                    let opacity = 1;
                    const hasProfileCard = this.profile.straal_card;
                    let showVehicleDetail = true;

                    let vehicleMinimalCapacity = 35;
                    if (this.vehicleTypes && this.vehicleTypes.length > 0) {
                        const typeIndex = this.vehicleTypes.findIndex(
                            (vehicleType) => vehicleType.id === vehicle.vehicle_type
                        );
                        if (typeIndex > -1) {
                            vehicleMinimalCapacity = this.vehicleTypes[typeIndex].minimal_capacity;
                        }
                    }
                    if (vehicle.vehicle_type === VehicleType.KICK_SCOOTER && vehicle.capacity >= vehicleMinimalCapacity) {
                        vehicleLink = true;
                        showVehicleDetail = ProfileHelper.canRideVehicle(this.profile, VehicleType.KICK_SCOOTER);
                        vehicleIcon = this.iconKickScooter;
                        opacity = ProfileHelper.canRideVehicle(this.profile, VehicleType.KICK_SCOOTER) && hasProfileCard ? 1 : 0.4;
                    } else if (vehicle.vehicle_type === VehicleType.SCOOTER && vehicle.capacity >= vehicleMinimalCapacity) {
                        vehicleLink = true;
                        showVehicleDetail = ProfileHelper.canRideVehicle(this.profile, VehicleType.SCOOTER);
                        vehicleIcon = this.iconScooter;
                        opacity = ProfileHelper.canRideVehicle(this.profile, VehicleType.SCOOTER) && hasProfileCard ? 1 : 0.4;
                    } else if (vehicle.vehicle_type === VehicleType.MOTO && vehicle.capacity >= vehicleMinimalCapacity) {
                        vehicleLink = true;
                        showVehicleDetail = ProfileHelper.canRideVehicle(this.profile, VehicleType.MOTO);
                        vehicleIcon = this.iconMoto;
                        opacity = ProfileHelper.canRideVehicle(this.profile, VehicleType.MOTO) && hasProfileCard ? 1 : 0.4;
                    } else if (vehicle.vehicle_type === VehicleType.CAR && vehicle.capacity >= vehicleMinimalCapacity) {
                        vehicleLink = true;
                        showVehicleDetail = ProfileHelper.canRideVehicle(this.profile, VehicleType.CAR);
                        vehicleIcon = this.iconCar;
                        opacity = ProfileHelper.canRideVehicle(this.profile, VehicleType.CAR) && hasProfileCard ? 1 : 0.4;
                    }

                    if (vehicleLink) {
                        const marker = L.marker(point, {
                            draggable: false,
                            icon: vehicleIcon,
                            interactive: true,
                            opacity: opacity
                        }).on("click", (mapMarker) => {
                            this.onMarkerClicked(
                                mapMarker,
                                vehicle.id,
                                vehicleLink,
                                vehicleLinkYou,
                                showVehicleDetail,
                                vehicle.vehicle_type
                            );
                        });
                        this.cluster.addLayer(marker);
                    }
                });

                this.parkingSpots.forEach((parkingSpot, index) => {
                    const point = L.latLng(parkingSpot.lat, parkingSpot.lng);
                    let parkingSpotIcon = this.iconParkingSpot;
                    let opacity = 1;
                    const marker = L.marker(point, {
                        draggable: false,
                        icon: parkingSpotIcon,
                        interactive: false,
                        opacity: opacity
                    });
                    this.clusterParking.addLayer(marker);
                });

                this.listenForPositionChanges();

                if (this.userSvc.activeMapFilter.length == 0 || this.userSvc.activeMapFilter.includes(FilterTypeEnums.KICKS_SPOTS)) {
                    this.map.addLayer(this.clusterParking);
                }
                this.map.addLayer(this.cluster);
                if (this.geoSrv.available) {
                    this.repoSrv.logToServer("distance", "map.ts, load");
                }

                this.loading = false;
            });
        } catch (e) {
            this.vehicles = [];
            if (e !== "cordova_not_available") {
                this.repoSrv.logToServer("map_load", "map.ts, load", JSON.stringify(e));
                this.utilsSrv.info("Info", "alert.message.reload-map");
            }
            this.loading = false;
        }
    }

    public markerOnClick() {
        if (ProfileHelper.isAnyUnfinished(this.profile)) {
            this.router.navigate(["/contract/taxameter", { id: this.profile.unfinished_contracts[0].id }], { replaceUrl: true });
        }
    }

    public unify(polyList): L.GeoJSON<any> {
        let unionTemp: GeoJsonObject;
        for (let i = 0; i < polyList.length; ++i) {
            if (i === 0) {
                unionTemp = polyList[i].toGeoJSON();
            } else {
                unionTemp = turf.union(unionTemp, polyList[i].toGeoJSON());
            }
        }
        return L.geoJSON(unionTemp, polyList.length ? { style: polyList[0].options } : null);
    }

    private createIcons(): void {
        this.iconMe = L.icon({
            iconUrl: "assets/marker_user_position.svg",
            iconSize: [18, 18],
            iconAnchor: [0, 0],
            popupAnchor: [0, -12]
        });

        this.iconCar = this.createMarkerIcon("assets/marker_car.svg");
        this.iconMoto = this.createMarkerIcon("assets/marker_moto.svg");
        this.iconScooter = this.createMarkerIcon("assets/marker_scooter.svg");
        this.iconKickScooter = this.createMarkerIcon("assets/marker_kick_scooter.svg");
        this.iconYou = this.createMarkerIcon("assets/marker_you.svg");
        this.iconParkingSpot = this.createMarkerIcon("assets/marker_parking_spot.svg");
    }

    public async ionViewWillEnter() {
        try {
            if (this.loaded) {
                return;
            }

            const vehiclesPromise = this.repoSrv.getVehicles(this.userSvc.activeMapFilter);
            const data: [Promise<string>, Promise<ConfigResponse>, Promise<ProfileResponse>, Promise<Array<ParkingSpot>>] = [
                this.platform.ready(),
                this.repoSrv.getConfig(false),
                this.repoSrv.getProfileWithContractInfo(),
                this.repoSrv.getParkingSpots(this.parkingSpotsType)
            ];

            const [platform, config, profile, parkingSpots] = await Promise.all(data);
            this.profile = profile;
            this.config = config;
            this.parkingSpots = parkingSpots;
            this.getSettings();

            this.menuCtrl.swipeGesture(false);

            let defaultPoint = L.latLng(49.8218177, 18.2360433); //Ostrava
            let zoom = 13;

            if (!!this.lastMapOptions && !!this.lastMapOptions.zoom) {
                defaultPoint = L.latLng(this.lastMapOptions.coord.lat, this.lastMapOptions.coord.lng);
                zoom = this.lastMapOptions.zoom;
            } else {
                if (this.geoSrv.available) {
                    defaultPoint = L.latLng(this.geoSrv.latitude, this.geoSrv.longitude);
                }
            }

            this.map = L.map(this.mapContainer.nativeElement, {
                zoomControl: true,
                attributionControl: false,
                fadeAnimation: false,
                markerZoomAnimation: true,
                minZoom: 5
            });

            this.map.setView(defaultPoint, zoom);
            this.clickHandler = (e) => {
                const merchId = e.target.getAttribute("data-merchId");
                const showVehicleDetail: boolean = JSON.parse(e.target.getAttribute("data-merchShow"));

                if (merchId)
                    //FIXME: nerozumím tomuhle kódu, poprosím o spojení vysvětlení a případný refactor
                {
                    this.onMarkerClicked(null, merchId, showVehicleDetail, null, true, null);
                }
            };

            this.elementRef.nativeElement.addEventListener("click", this.clickHandler);


            const mapUrl = this.config.map_server + "/{z}/{x}/{y}.png";
            L.tileLayer(mapUrl, { maxZoom: 19 }).addTo(this.map);
            this.vehicleTypes = await this.repoSrv.getVehicleTypes();

            const circles = new L.LayerGroup();
            if (this.userSvc.activeMapFilter.length == 0 || this.userSvc.activeMapFilter.includes(FilterTypeEnums.ZONES)) {
                if (this.config) {
                    this.config.areas.forEach((area, index) => {
                        let areaOptions, options;

                        if (area.options) {
                            areaOptions = area.options;
                            options = {
                                stroke: areaOptions.stroke,
                                weight: areaOptions.weight,
                                color: areaOptions.color,
                                opacity: areaOptions.opacity,
                                lineCap: areaOptions.line_cap,
                                lineJoin: areaOptions.line_join,
                                dashArray: areaOptions.dash_array,
                                dashOffset: areaOptions.dash_offset,
                                fill: areaOptions.fill,
                                fillColor: areaOptions.fill_color,
                                fillOpacity: areaOptions.fill_opacity,
                                fillRule: areaOptions.fill_rule,
                                bubblingMouseEvents: areaOptions.bubbling_mouse_events,
                                className: areaOptions.class_name
                            };
                        }
                        if (area.type === "Circle") {
                            LGeo.circle([area.lat, area.lng], area.radius, options).addTo(circles);
                        } else if (area.type == null) {
                            // Tento polygon nechceme
                        } else {
                            L.polygon([area.items as any], options).addTo(this.map);
                        }
                    });
                }
                this.unify(circles.getLayers()).addTo(this.map);
            }

            const loaderDismissPromise = null;
            try {
                const vehicles = await vehiclesPromise;
                this.vehicles = vehicles.vehicles;
                console.log(this.vehicles);
                this.vehicleBorrowed = vehicles["borrowed-vehicle"];
                this.vehicleSrv.reloadVehicleCache();
                await this.load();
            } catch (e) {
                this.repoSrv.logToServer("map_load", "map.ts, ionViewDidEnter", JSON.stringify(e));
                this.loaded = true;
                this.utilsSrv.error(e);
            }

            this.loaded = true;
            if (!this.lastMapOptions) {
                this.locate();
            } else {
                this.lastMapOptions = null;
            }

            if (loaderDismissPromise) {
                await loaderDismissPromise;
            }
        } catch (e) {
            this.utilsSrv.error(e);
        }
    }

    private createMarkerIcon(iconUrl: string): L.Icon {
        return L.icon({
            iconUrl: iconUrl,
            iconSize: [36, 52],
            iconAnchor: [12, 48],
            popupAnchor: [0, -12]
        });
    }

    public async ionViewWillLeave() {
        this.elementRef.nativeElement.removeEventListener("click", this.clickHandler);

        if (this.positionSubscription) {
            this.positionSubscription.unsubscribe();
        }
    }

    public async disableMarkerClick(marker): Promise<void> {
        this.zone.run(() => {
            marker.target.off();
        });
    }

    public async enableMarkerClick(
        marker,
        vehicleId,
        vehicleLink,
        vehicleDetailYou,
        showVehicleDetail,
        vehicleType
    ): Promise<void> {
        this.zone.run(() => {
            marker.target.on("click", (event) => {
                this.onMarkerClicked(event, vehicleId, vehicleLink, vehicleDetailYou, showVehicleDetail, vehicleType);
            });
        });
    }

    public async onMarkerClicked(
        marker,
        vehicleId: string,
        vehicleLink,
        vehicleDetailYou,
        showVehicleDetail,
        vehicleType: number
    ) {
        //FIXME: Spouštění stránky detailu vozidla je shodné z mapy i ze seznamu a měla by to být jedna metoda
        try {
            if (showVehicleDetail) {
                await this.disableMarkerClick(marker); // to prevent double click
                this.repoSrv.logToServer("info", "map.ts, markerClicked", vehicleId.toString());
                await this.vehicleSrv.openVehiclePage(this.profile, vehicleId, this.navCtrl, vehicleType);
                await this.enableMarkerClick(
                    marker,
                    vehicleId,
                    vehicleLink,
                    vehicleDetailYou,
                    showVehicleDetail,
                    vehicleType
                );
            } else {
                await this.disableMarkerClick(marker); // to prevent double click
                await this.navCtrl.navigateForward("/user/documents");
                await this.utilsSrv.notify(this.repoSrv.translates.MissingDocumentsText);
                await this.enableMarkerClick(
                    marker,
                    vehicleId,
                    vehicleLink,
                    vehicleDetailYou,
                    showVehicleDetail,
                    vehicleType
                );
            }
        } catch (e) {
            this.repoSrv.logToServer("error", "map.ts, onMarkerClicked", e);
            await this.enableMarkerClick(
                marker,
                vehicleId,
                vehicleLink,
                vehicleDetailYou,
                showVehicleDetail,
                vehicleType
            );
        }
    }

    public locate(zoom = false): void {
        if (this.geoSrv.available) {
            if (zoom) {
                this.map.flyTo(L.latLng(this.geoSrv.latitude, this.geoSrv.longitude), 15, { duration: 0.25 });
            } else {
                this.map.panTo(L.latLng(this.geoSrv.latitude, this.geoSrv.longitude));
            }
        }
    }

    public async presentVehicleFilter(): Promise<void> {
        this.vehicleFilterAlert = await this.alertCtrl.create({
            header: this.translateSrv.instant("alert.title.show-vehicles-type"),
            cssClass: "vehicleFilter",
            inputs: [
                /*  Nechávám k pozdějšímu použití pro P2P
                {
                      type: "checkbox",
                      label: this.translateSrv.instant("alert.label.cars"),
                      value: FilterTypeEnums.CARS,
                      checked: this.vehiclesFilter.indexOf(FilterTypeEnums.CARS) > -1
                  },
                  {
                      type: "checkbox",
                      label: this.translateSrv.instant("alert.label.moto"),
                      value: FilterTypeEnums.MOTORCYCLES,
                      checked: this.vehiclesFilter.indexOf(FilterTypeEnums.MOTORCYCLES) > -1
                  },
                  */
                {
                    type: "checkbox",
                    label: this.translateSrv.instant("alert.label.scooters"),
                    value: FilterTypeEnums.SCOOTERS,
                    checked: this.userSvc.activeMapFilter.indexOf(FilterTypeEnums.SCOOTERS) > -1
                },
                {
                    type: "checkbox",
                    label: this.translateSrv.instant("alert.label.kicks"),
                    value: FilterTypeEnums.KICKS,
                    checked: this.userSvc.activeMapFilter.indexOf(FilterTypeEnums.KICKS) > -1
                },
                {
                    type: "checkbox",
                    label: this.translateSrv.instant("alert.label.kicks_spots"),
                    value: FilterTypeEnums.KICKS_SPOTS,
                    checked: this.userSvc.activeMapFilter.indexOf(FilterTypeEnums.KICKS_SPOTS) > -1
                },
                {
                    type: "checkbox",
                    label: this.translateSrv.instant("alert.label.zones"),
                    value: FilterTypeEnums.ZONES,
                    checked: this.userSvc.activeMapFilter.indexOf(FilterTypeEnums.ZONES) > -1
                }
            ],
            buttons: [
                {
                    text: this.translateSrv.instant("alert.button.cancel"),
                    role: "cancel",
                    cssClass: "cancel-button"
                },
                {
                    text: this.translateSrv.instant("alert.button.submit"),
                    cssClass: "submit-button",
                    handler: (data) => {
                        this.userSvc.activeMapFilter = data;
                        this.loaded = false;
                        this.lastMapOptions = {
                            zoom: this.map && this.map.getZoom(),
                            coord: this.map && this.map.getCenter()
                        };
                        this.map.remove();
                        this.ionViewWillEnter();
                    }
                }
            ]
        });
        await this.vehicleFilterAlert.present();
    }

    public navTo(page): void {
        this.navCtrl.navigateForward(page);
    }
}
