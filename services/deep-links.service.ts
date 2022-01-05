import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Deeplinks } from "@ionic-native/deeplinks/ngx";
import { ApiService } from "./api.service";
import { EventsService } from "./events.servise";
import { RepositoryService } from "./repository.service";
import { VehicleService } from "./vehicle.service";
import { NavController } from "@ionic/angular";
import { UserService } from "./user.service";
import { UtilsService } from "./utils.service";

@Injectable({
    providedIn: "root"
})
export class DeeplinkService {

    startupComplete = false;
    coldStartLink: { path: string, queryString: string };

    constructor(
        private deeplinks: Deeplinks,
        private router: Router,
        private apiSrv: ApiService,
        private userSvc: UserService,
        private eventsSrv: EventsService,
        private repoSrv: RepositoryService,
        private vehicleSrv: VehicleService,
        private navCtrl: NavController,
        private utilsSrv: UtilsService
    ) {
        this.eventsSrv.getAppStartup().subscribe(startupComplete => {
            this.startupComplete = startupComplete;
            if (startupComplete && this.coldStartLink && this.apiSrv.logged) {
                this.handleDeeplink(this.coldStartLink);
                this.coldStartLink = undefined;
            }
        });
    }

    init() {
        this.subscribeHandlers();
    }

    subscribeHandlers() {
        this.deeplinks.route({})
            .subscribe(
                _routeMatch => {
                    // direct navigation - unused
                },
                event => {
                    console.log("Deep link received", event);
                    // handle navigation manually here
                    // routeNoMatch.$link - the full link data
                    if (!event.$link || !event.$link.url) {
                        return;
                    }
                    if (this.startupComplete && this.apiSrv.logged) {
                        this.handleDeeplink(event.$link);
                    } else {
                        // save link to handle navigation after startup completed
                        this.coldStartLink = event.$link;
                    }
                    // always resubscribe due to plugin bug, https://github.com/ionic-team/ionic-plugin-deeplinks/issues/77
                    this.subscribeHandlers();
                });
    }

    async handleDeeplink(link: { path: string, queryString: string }) {
        const urlParams = new URLSearchParams(link.queryString);
        if (urlParams.get("vehicleId")) {
            const profile = await this.repoSrv.getProfileWithContractInfo();
            await this.vehicleSrv.openVehiclePage(
                profile,
                urlParams.get("vehicleId"),
                this.navCtrl,
                Number(urlParams.get("vehicleType"))
            );
        }
        if (urlParams.get("url") === "user/documents") {
            try {
                await this.userSvc.getUserWithImages();
            } catch (e) {
                this.repoSrv.logToServer("error", "documents.ts, load", JSON.stringify(e));
                await this.utilsSrv.notify("toast.message.profile-load-failed");
            }
            this.navCtrl.navigateForward(urlParams.get("url"));
        } else {
            if (urlParams.get("url")) {
                this.navCtrl.navigateForward(urlParams.get("url"));
            }
        }
    }
}
