import { Component, Input } from "@angular/core";
import { ProfileResponse } from "../../models/profileResponse";
import { ProfileHelper } from "../../models/Extensions/ProfileHelper";
import { MenuController, NavController, Platform } from "@ionic/angular";
import { RepositoryService } from "../../services/repository.service";
import { UtilsService } from "../../services/utils.service";
import { EventsService } from "../../services/events.servise";
import { ConnectionStatusEnum, NetworkService } from "../../services/network.service";
import { Router } from "@angular/router";
import { PreviousRouteService } from "../../services/previous-route.service";

@Component({
    selector: "app-footer-menu",
    templateUrl: "./footer-menu.component.html"
})
export class FooterMenuComponent {
    @Input() public modal: any;
    @Input() public loading = false;
    public pages: any;
    public activePage: string;
    public disabled = false;
    public profile: ProfileResponse;

    constructor(
        private navCtrl: NavController,
        private menuCtrl: MenuController,
        private repoSrv: RepositoryService,
        public platform: Platform,
        private utilsSrv: UtilsService,
        private eventsSrv: EventsService,
        private networkSrv: NetworkService,
        private router: Router,
        public previousRouteSrv: PreviousRouteService
    ) {
        this.pages = [
            {
                url: "",
                text: "menu.loading"
            },
            {
                url: "/map",
                text: "menu.map"
            },
            {
                url: "/vehicle/list",
                text: "menu.vehicles"
            }
        ];
    }

    public async ngOnInit() {
        this.profile = await this.repoSrv.getProfileWithContractInfo();
        await this.getMenuPages();
    }

    public async getMenuPages(): Promise<void> {
        this.activePage = this.router.url;
        if (ProfileHelper.isAnyActive(this.profile)) {
            this.pages = [
                {
                    url: "/contract/taxameter",
                    text: "menu.active-ride"
                },
                {
                    url: "/map",
                    text: "menu.map"
                },
                {
                    url: "/vehicle/list",
                    text: "menu.vehicles"
                }
            ];
        } else if (ProfileHelper.isAnyReserved(this.profile)) {
            this.pages = [
                {
                    url: "/contract/reservation",
                    text: "menu.reservation"
                },
                {
                    url: "/map",
                    text: "menu.map"
                },
                {
                    url: "/vehicle/list",
                    text: "menu.vehicles"
                }
            ];
        } else if (ProfileHelper.isAnyPaused(this.profile)) {
            this.pages = [
                {
                    url: "/contract/pause",
                    text: "menu.pause"
                },
                {
                    url: "/map",
                    text: "menu.map"
                },
                {
                    url: "/vehicle/list",
                    text: "menu.vehicles"
                }
            ];
        } else if (ProfileHelper.isAnyUnpaid(this.profile)) {
            this.pages = [
                {
                    url: "/contract/pay",
                    text: "menu.pay"
                },
                {
                    url: "/map",
                    text: "menu.map"
                },
                {
                    url: "/vehicle/list",
                    text: "menu.vehicles"
                }
            ];
        } else {
            this.pages = [
                {
                    url: "/before-ride",
                    text: "menu.before-ride"
                },
                {
                    url: "/map",
                    text: "menu.map"
                },
                {
                    url: "/vehicle/list",
                    text: "menu.vehicles"
                }
            ];
        }
    }

    public async navTo(page): Promise<void> {
        if (page === "") {
            return;
        }
        this.disabled = true;
        if (this.networkSrv.previousStatus === ConnectionStatusEnum.Online) {
            if (page === "/contract/taxameter") {
                this.navCtrl.navigateRoot("/contract/taxameter", {replaceUrl: true});
            } else if (page === "ReservationPage") {
                this.navCtrl.navigateRoot("/contract/reservation", {replaceUrl: true});
            } else if (page === "PausePage") {
                this.navCtrl.navigateRoot("/contract/pause", {replaceUrl: true});
            } else if (page === "PayPage") {
                this.navCtrl.navigateRoot("/contract/pay", {replaceUrl: true});
            } else {
                this.navCtrl.navigateRoot(page, {replaceUrl: true});
            }

        } else {
            await this.utilsSrv.notify("toast.message.no-connection");
        }

        this.disabled = false;
    }

    public async openMenu(): Promise<void> {
        if (this.networkSrv.previousStatus === ConnectionStatusEnum.Online) {
            this.disabled = true;
            await this.menuCtrl.enable(true);
            if (this.modal) {
                await this.modal.dismiss();
            }
            await this.menuCtrl.toggle();
            this.disabled = false;
        } else {
            await this.utilsSrv.notify("toast.message.no-connection");
        }
    }
}
