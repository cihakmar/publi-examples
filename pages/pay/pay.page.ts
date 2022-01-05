import { Component } from "@angular/core";
import * as moment from "moment";
import { TranslateService } from "@ngx-translate/core";
import { ContractResponse } from "../../../../models/contracts/contractResponse";
import { VehicleResponse } from "../../../../models/vehicle/vehicleResponse";
import { StraalResponse } from "../../../../models/payment/straalResponse";
import { ProfileResponse } from "../../../../models/profileResponse";
import { RepositoryService } from "../../../../services/repository.service";
import { UtilsService } from "../../../../services/utils.service";
import { ActivatedRoute, Router } from "@angular/router";
import { ContractService } from "../../../../services/contract.service";
import { StatesService } from "../../../../services/states.service";
import { CallNumber } from "@ionic-native/call-number/ngx";
import { EventsService } from "../../../../services/events.servise";
import { GatewayService } from "../../../../services/gateway.service";
import { AlertController, ModalController, NavController } from "@ionic/angular";

@Component({
    templateUrl: "pay.page.html",
    selector: "app-pay",
    styleUrls: ["./pay.page.scss"]
})
export class PayPage {
    public id: string;
    public loading = true;
    public loaded = false;
    public failedPayment: boolean = false;
    public contract: ContractResponse;
    public vehicle: VehicleResponse;
    public vehicleImage: string;
    public payResponse: StraalResponse;
    public showOnlyTime: boolean = true;
    public cardModal: HTMLIonModalElement;
    public profile: ProfileResponse;

    public constructor(
        private nav: NavController,
        public repoSrv: RepositoryService,
        private utilsSrv: UtilsService,
        private activatedRoute: ActivatedRoute,
        private contractSrv: ContractService,
        public statesSrv: StatesService,
        public modalCtrl: ModalController,
        private callNumber: CallNumber,
        private eventsSrv: EventsService,
        public gateway: GatewayService,
        public alertCtrl: AlertController,
        public translateSrv: TranslateService,
        private router: Router
    ) {
        this.activatedRoute.params.subscribe(params => {
            this.payResponse = params.payResponse;
        });
    }

    public async ionViewDidEnter() {
        if (this.loaded) {
            return;
        }

        try {
            this.loaded = await this.load();
        } catch (e) {
            this.repoSrv.logToServer("error", "pay.ts, load", e);
            await this.utilsSrv.notify("global.error");
            this.router.navigate(["/map"], { replaceUrl: true });
        }
    }

    public async load() {
        this.loading = true;
        this.profile = await this.repoSrv.getProfileWithContractInfo();
        this.id = this.profile.unpaid_contracts[0].id;
        this.contract = this.profile.unpaid_contracts[0];

        if (!this.id) {
            throw new Error("PayPage loaded without ID");
        }

        if (moment(this.contract.start_at).format("DD.MM.YYYY") !== moment().format("DD.MM.YYYY")) {
            this.showOnlyTime = false;
        }

        this.vehicle = await this.repoSrv.getVehicle(this.contract.vehicle_id);
        if (this.vehicle) {
            this.vehicleImage = this.repoSrv.getVehicleThumbnail(this.vehicle.vehicle_type);
        }

        this.loading = false;
        return !this.loading;
    }

    public async backToMap() {
        this.router.navigate(["/map"], { replaceUrl: true });

    }

    public async ionViewWillLeave() {
        await this.closeCardModal();
    }

    public async closeCardModal() {
        if (this.cardModal) {
            await this.cardModal.dismiss();
        }
    }

    public async pay() {
        this.contractSrv.payContractAndHandleResponse(this.contract, this.nav, true, true, null);
    }

    public async alternativePay() {
        if (this.payResponse.gw_url && this.payResponse.gw_url !== "") {
            await this.gateway.pay(this.payResponse.gw_url);
            await this.reloadProfile();
            this.failedPayment = false;
            await this.load();
        } else {
            const alert = await this.alertCtrl.create({
                header: this.translateSrv.instant("alert.title.no-payment-gateway"),
                subHeader: this.translateSrv.instant("alert.subtitle.no-payment-gateway"),
                buttons: [
                    {
                        text: this.translateSrv.instant("alert.button.cancel"),
                        role: "cancel",
                        cssClass: "cancel-button"
                    },
                    {
                        text: this.translateSrv.instant("alert.button.call"),
                        cssClass: "submit-button",
                        handler: () => {
                            this.call("+420776099497");
                        }
                    }
                ]
            });
            await alert.present();
        }
    }

    public async reloadProfile() {
        await this.repoSrv.getProfileWithContractInfo();
    }

    public showPaymentOk() {
        if (this.contract.amount > 0) {
            return this.statesSrv.isPaid(this.contract.payment_state);
        } else {
            return !this.statesSrv.isPayable(
                this.contract.payment_state,
                this.contract.amount,
                this.contract.payment_method
            );
        }
    }

    public goTo(page) {
        this.router.navigate([page, { id: this.id }]);
    }

    public call(phoneNumber) {
        this.callNumber
            .callNumber(phoneNumber, true)
            .then((res) => console.log("Launched dialer!", res))
            .catch((err) => console.log("Error launching dialer", err));
    }
}
