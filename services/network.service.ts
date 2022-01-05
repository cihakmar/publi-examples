import { Injectable } from "@angular/core";
import { AlertController } from "@ionic/angular";
import { EventsService } from "./events.servise";
import { Network } from "@ionic-native/network/ngx";

export enum ConnectionStatusEnum {
    Online,
    Offline,
}

@Injectable({
    providedIn: "root"
})
export class NetworkService {
    public previousStatus: ConnectionStatusEnum;
    public offlineRedirect: boolean = false;

    constructor(
        private alertCtrl: AlertController,
        private network: Network,
        public eventsSrv: EventsService
    ) {
        this.previousStatus = ConnectionStatusEnum.Online;
    }

    public initializeNetworkEvents(): void {
        console.log("Init network events");

        this.network.onDisconnect().subscribe(() => {
            console.log("ON DISCONNECT", this.previousStatus);

            if (this.previousStatus === ConnectionStatusEnum.Online) {
                this.eventsSrv.sendNetworkOfflineEvent({});
            }
            this.previousStatus = ConnectionStatusEnum.Offline;
        });
        this.network.onConnect().subscribe(() => {
            console.log("ON CONNECT", this.previousStatus);

            if (this.previousStatus === ConnectionStatusEnum.Offline) {
                this.eventsSrv.sendNetworkOnlineEvent({});
            }
            this.previousStatus = ConnectionStatusEnum.Online;
        });
    }
}
