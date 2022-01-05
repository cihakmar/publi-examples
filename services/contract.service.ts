import { Injectable } from "@angular/core";
import { RepositoryService } from "./repository.service";
import { UtilsService } from "./utils.service";
import { ImageService } from "./image.service";
import { Router } from "@angular/router";
import { LoadingController } from "@ionic/angular";

@Injectable({
    providedIn: "root"
})
export class ContractService {
    public constructor(
        private repoSrv: RepositoryService,
        private utilsSrv: UtilsService,
        private imageSrv: ImageService,
        private router: Router,
        private loadingCtrl: LoadingController
    ) {
    }

    public async handleEndContractError(error, sender) {
        //úmyslně je volání asynchronní
        this.repoSrv.logToServer("error", sender, error);
        if (error.code === 417 || error.status === 417) {
            await this.utilsSrv.notifyAlert("toast.message.vehicle-not-locked");
        } else {
            await this.utilsSrv.notifyAlert("global.error");
        }
    }

    public async endContractAndPauseOrPay(
        contractId: string,
        pause: boolean,
        capacity: number,
        navCtrl,
        correctly_parked: boolean,
        investigation_request: boolean
    ): Promise<void> {
        const loading = await this.loadingCtrl.create();
        await loading.present();
        try {
            await this.imageSrv.uploadContractImage(contractId, 3);
            await this.repoSrv.endContract(contractId, capacity, pause ? true : null, correctly_parked, investigation_request);
        } catch (e) {
            await loading.dismiss()
            await this.handleEndContractError(e, "endContractAndPauseOrPay");
        }

        //yes we want to continue
        if (pause) {
            const pauseParams = {
                id: contractId,
                lockAction: true
            };
            await this.repoSrv.pauseContract(contractId);
            await loading.dismiss()
            this.router.navigate(["/contract/pause", pauseParams], { replaceUrl: true });
        } else {
            const contract = await this.repoSrv.checkContract(contractId);
            await loading.dismiss()

            await this.payContractAndHandleResponse(contract, navCtrl, true, true);
        }
    }

    public async payContractAndHandleResponse(
        contract,
        navCtrl,
        errorRedirect = true,
        isInitial = false,
        requestId = null
    ): Promise<void> {
        if (!contract || !contract.id) {
            console.log("payContractAndHandleResponse not recognized contract: " + contract);
            throw Error("payContractAndHandleResponse not recognized contract: " + contract);
        }

        try {
            const straalResponse = await this.repoSrv.payContract(contract.id, requestId);
            console.log(straalResponse);
            if (straalResponse.code === 404 && errorRedirect === true) {
                console.log("volam add card");
                const AddCardParams = {
                    showCardModal: false,
                    cryptKey: straalResponse.cryptKey,
                    contract: contract
                };
                this.utilsSrv.notify("toast.message.card-not-saved");
                if (isInitial === true) {
                    this.router.navigate(["/card/add", AddCardParams], { replaceUrl: true });
                } else {
                    this.router.navigate(["/card/add", AddCardParams]);
                }
                return;
            }

            if (straalResponse.code === 200) {
                this.router.navigate(["/contract/pay/success", {
                    vehicleId: contract.vehicle_id
                }], { replaceUrl: true });
                return;
            }

            if (errorRedirect === true) {
                this.router.navigate(["/contract/pay/failed", {
                    contract: contract,
                    payResponse: null
                }], { replaceUrl: true });
                return;
            }
        } catch (e) {
            this.router.navigate(["/contract/pay/failed", {
                contract: contract,
                payResponse: null
            }], { replaceUrl: true });
        }
    }
}
