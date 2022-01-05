import { Injectable, NgZone } from "@angular/core";
import { Device } from "@ionic-native/device/ngx";
import { ConfigResponse } from "../models/configResponse";
import { ContractResponse } from "../models/contracts/contractResponse";
import { PayDirectRequest } from "../models/payment/payDirectRequest";
import { StraalResponse } from "../models/payment/straalResponse";
import { ProfileResponse } from "../models/profileResponse";
import { TranslatesResponse } from "../models/translatesResponse";
import { VehiclesFastResponse } from "../models/vehicle/vehiclesFastResponse";
import { ApiService } from "./api.service";
import { TranslatorService } from "./translator.service";
import { Config } from "../../config";
import { ParkingSpot } from "../models/parkingSpot";

@Injectable({
    providedIn: "root"
})
export class RepositoryService {
    public translates: TranslatesResponse;
    public isPlatformCordova: boolean;

    public constructor(
        private apiSrv: ApiService,
        private translatorSrv: TranslatorService
    ) {
    }

    public async getTranslates(langCode: string): Promise<TranslatesResponse> {
        this.translates = await this.apiSrv.send<TranslatesResponse>("GET", "/api/localizations/" + langCode);
        return this.translates;
    }

    public async registerForPush(deviceId: string, devicePlatform: string, pushToken: string): Promise<any> {
        return await this.apiSrv.send<any>("POST", "/api/notification/settings", null, {
            fcmToken: pushToken,
            devicePlatform,
            deviceId
        });
    }

    public async getVehicles(vehiclesFilter: Array<string>): Promise<VehiclesFastResponse> {
        let apiEndpoint = "/api/vehicles-fast";
        let queryString = "";
        if (vehiclesFilter && vehiclesFilter.length > 0) {
            for (const id in vehiclesFilter) {
                if (queryString === "") {
                    queryString = queryString + "?vehicleTypes=" + vehiclesFilter[id];
                } else {
                    queryString = queryString + "&vehicleTypes=" + vehiclesFilter[id];
                }
            }
            apiEndpoint += queryString;
        }
        return await this.apiSrv.send<VehiclesFastResponse>("GET", apiEndpoint);
    }

    public async getVehiclesClosest(vehiclesCount: number, vehiclesFilter: Array<string>): Promise<VehiclesFastResponse> {
        let apiEndpoint = "/api/vehicles-list";
        let queryString = "";
        if (vehiclesCount) {
            queryString = queryString + "?take=" + vehiclesCount;
        }
        if (vehiclesFilter && vehiclesFilter.length > 0) {
            for (const id in vehiclesFilter) {
                if (queryString === "") {
                    queryString = queryString + "?vehicleTypes=" + vehiclesFilter[id];
                } else {
                    queryString = queryString + "&vehicleTypes=" + vehiclesFilter[id];
                }
            }
        }
        apiEndpoint += queryString;
        return await this.apiSrv.send<VehiclesFastResponse>("GET", apiEndpoint);
    }

    public async endContract(id: string, capacity = null, lock = null, correctly_parked = true, investigation_request = false): Promise<ContractResponse> {
        return await this.apiSrv.send<ContractResponse>("POST", "/api/contracts/" + id + "/end", null, {
            capacity,
            lock,
            correctly_parked,
            investigation_request
        });
    }

    public async pauseContract(id: string): Promise<ContractResponse> {
        return await this.apiSrv.send<ContractResponse>("POST", "/api/contracts/" + id + "/pause", null, null);
    }

    public async getParkingSpots(vehicleType: number): Promise<Array<ParkingSpot>> {
        let url: string = "/api/parking-spots";
        if (vehicleType) {
            url = "/api/parking-spots?vehicleType=" + vehicleType;
        }
        return await this.apiSrv.send<Array<ParkingSpot>>("GET", url);
    }

    public async payContract(id: string, requestId: string): Promise<StraalResponse> {
        return await this.apiSrv.send<StraalResponse>("POST", "/api/contracts/" + id + "/pay-direct", null, {
            request_id: requestId
        } as PayDirectRequest);
    }

    private async getProfile(contractInfo = false, images = false): Promise<ProfileResponse> {
        return this.apiSrv.send<ProfileResponse>("GET", `/api/profile?images=${images}&contract_info=${contractInfo}`);
    }

    public async resetPassword(username: string): Promise<any> {
        return await this.apiSrv.send("POST", "/api/password_reset", null, {
            email: username,
            language: this.translatorSrv.current
        });
    }

    public async sendVerificationCode(phoneNumber: string): Promise<any> {
        return await this.apiSrv.send("POST", "/api/profile/send_validation_sms", null, {
            phone_number: phoneNumber
        });
    }

    public async validatePhone(code: string): Promise<any> {
        return await this.apiSrv.send("POST", "/api/profile/validate_phone_number", null, {
            code
        });
    }
}
