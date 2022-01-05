import { Component } from "@angular/core";
import { ContractResponse } from "../../../../models/contracts/contractResponse";
import { VehicleResponse } from "../../../../models/vehicle/vehicleResponse";
import { ProfileResponse } from "../../../../models/profileResponse";
import { AlertController, NavController } from "@ionic/angular";
import { UtilsService } from "../../../../services/utils.service";
import { RepositoryService } from "../../../../services/repository.service";
import { StatesService } from "../../../../services/states.service";
import { TranslateService } from "@ngx-translate/core";
import { TaxameterService } from "../../../../services/taxameter.service";
import * as moment from "moment";
import { ActivatedRoute, Router } from "@angular/router";
import { VehicleService } from "../../../../services/vehicle.service";

@Component({
    templateUrl: "taxameter.page.html",
    selector: "app-v",
    styleUrls: ["./taxameter.page.scss"]
})
export class TaxameterPage {
    public id: string;

    public loading = true;
    public loaded = false;
    public contract: ContractResponse;
    public vehicle: VehicleResponse;
    public vehicleImage: string;
    public discount = 0;
    private taxameterInterval;
    public config;
    public profile: ProfileResponse;

    public lockAction: boolean;

    public constructor(
        private navCtrl: NavController,
        private utilsSrv: UtilsService,
        private repoSrv: RepositoryService,
        public statesSrv: StatesService,
        public alertCtrl: AlertController,
        public taxameterSrv: TaxameterService,
        public vehicleSvc: VehicleService,
        public translateSrv: TranslateService,
        private router: Router,
        private activatedRoute: ActivatedRoute
    ) {
    }

    public async ngOnInit() {
        this.activatedRoute.queryParams.subscribe(params => {
            console.log(params);
            this.lockAction = params.lockAction;
        });
        if (this.loaded) {
            return;
        }
        try {
            this.loaded = await this.load();
            clearInterval(this.taxameterInterval);
            this.taxameterInterval = setInterval(async () => {
                this.refreshTaxamater();
            }, 15000);
        } catch (e) {
            this.repoSrv.logToServer("error", "taxameter.ts, load", e);
            await this.utilsSrv.notify("global.error");
            await this.navCtrl.navigateRoot("/map");
        }
    }

    public async ionViewWillLeave() {
        console.log("clearInterval");
        clearInterval(this.taxameterInterval);
    }

    public async load(): Promise<boolean> {
        this.loading = true;
        this.profile = await this.repoSrv.getProfileWithContractInfo();
        if (this.profile.unfinished_contracts.length === 0) {
            throw new Error("There is no unfinished contracts");
        }

        this.id = this.profile.unfinished_contracts[0].id;
        this.contract = this.profile.unfinished_contracts[0];
        this.vehicle = await this.repoSrv.getVehicle(this.profile.unfinished_contracts[0].vehicle_id);
        this.vehicleImage = this.repoSrv.getVehicleThumbnail(this.vehicle.vehicle_type);
        this.discount = this.profile.discount;
        this.config = this.repoSrv.getConfig();
        this.taxameterSrv.taxameter.startAt = moment(this.contract.start_at);
        await this.taxameterSrv.getContractPrice(this.id, this.navCtrl);

        this.loading = false;
        return true;
    }

    public async refreshTaxamater(): Promise<void> {
        this.taxameterSrv.getContractPrice(this.id, this.navCtrl);
        this.profile = await this.repoSrv.getProfileWithContractInfo();
        this.taxameterSrv.checkActiveContract(this.contract, "taxametr.ts, contractCheckerInterval", this.navCtrl);
    }

    public async submit(): Promise<void> {
        let parkZone = null;
        try {
            parkZone = await this.repoSrv.checkZone(this.contract.vehicle_id);
        } catch (e) {
            this.repoSrv.logToServer("error", "taxameter.ts, submit", e);
        }

        if (parkZone && parkZone.can_park === false) {
            await this.presentParkAlert();
        } else {
            this.finishTaxameterPage();
        }
    }

    public async presentParkAlert(): Promise<void> {
        const alert = await this.alertCtrl.create({
            subHeader: this.repoSrv.translates.OutsideZone,
            cssClass: "parkAlert",
            buttons: [
                {
                    text: this.translateSrv.instant("alert.button.park-continue"),
                    role: "cancel",
                    cssClass: "cancel-button"
                },  {
                    text: this.translateSrv.instant("alert.button.park-investigation"),
                    cssClass: "cancel-button",
                    handler: (data) => {
                        this.finishTaxameterPage(false, true);
                    }
                },
                {
                    text: this.translateSrv.instant("alert.button.park-finish"),
                    cssClass: "submit-button",
                    handler: (data) => {
                        this.finishTaxameterPage(false);
                    }
                }
            ]
        });
        await alert.present();
    }

    public finishTaxameterPage(correctly_parked = true, investigation_request = false): void {
        this.router.navigate(["/contract/before-pay", {
            id: this.id,
            oldCapacity: this.vehicle.capacity,
            contract: JSON.stringify(this.contract),
            vehicle: JSON.stringify(this.vehicle),
            correctly_parked,
            investigation_request
        }]);
    }
}
