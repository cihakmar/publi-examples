import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Camera, CameraOptions } from "@ionic-native/camera/ngx";
import { FileLoaderService } from "./file-loader.service";
import { ApiService } from "./api.service";
import { Platform } from "@ionic/angular";
import { RepositoryService } from "./repository.service";

@Injectable({
    providedIn: 'root'
})
export class ImageService {
    public defaultSize = 8388608;
    public uploadedFile: File;
    public formData;

    constructor(
        private httpClient: HttpClient,
        private camera: Camera,
        private fileLoaderSrv: FileLoaderService,
        private apiSrv: ApiService,
        private platform: Platform,
        private repoSrv: RepositoryService,

    ) {
        if (this.platform.is("ios")) {
            this.defaultSize = 83886080;
        }
    }

    public async processImage(imageType, source) {
        const cameraOptions: CameraOptions = {
            quality: 50,
            targetWidth: 500,
            targetHeight: 700,
            sourceType: source,
            destinationType: this.camera.DestinationType.FILE_URI,
            encodingType: this.camera.EncodingType.JPEG,
            mediaType: this.camera.MediaType.PICTURE,
            correctOrientation: true
        };
        const imagePath: string = await this.camera.getPicture(cameraOptions);
        this.uploadedFile = await this.fileLoaderSrv.getSingleFile(imagePath);
        const resp = {
            file: this.uploadedFile,
            status: "Success"
        };
        this.formData = new FormData();
        this.formData.append("file", this.uploadedFile, this.uploadedFile.name);
        if (this.uploadedFile && (this.uploadedFile.size > this.defaultSize)) {
            resp.status = "tooBig";
        }
        if (!this.uploadedFile) {
            resp.status = "Error";
        }
        return resp;
    }

    public async uploadContractImage(contractId, tries = 3): Promise<any> {
        const headers = new HttpHeaders({
            Authorization: "Bearer " + this.apiSrv.token.access
        });
        if ((this.apiSrv.logged && !this.apiSrv.token.access) || this.apiSrv.refreshPromise) {
            try {
                await this.apiSrv.refresh();
            } catch (e) {
                throw e;
            }
        }
        headers.set("Authorization", "Bearer " + this.apiSrv.token.access);
        const serverUri = this.apiSrv.getServer();
        if (this.formData && this.repoSrv.isPlatformCordova) {
            try {
                return await this.httpClient
                    .post<any>(serverUri + "/api/contracts/" + contractId + "/image", this.formData, { headers: headers })
                    .toPromise();
            } catch (e) {
                if ((e.status !== 401 && e.status !== 403) || tries === 0) throw e;
                try {
                    await this.apiSrv.refresh();
                    return this.uploadContractImage(contractId, --tries);
                } catch (e) {
                    throw e;
                }
            }
        }
    }

    public async uploadImages(imageType, tries = 3): Promise<any> {
        const headers = new HttpHeaders({
            Authorization: "Bearer " + this.apiSrv.token.access
        });
        if ((this.apiSrv.logged && !this.apiSrv.token.access) || this.apiSrv.refreshPromise) {
            try {
                await this.apiSrv.refresh();
            } catch (e) {
                throw e;
            }
        }
        headers.set("Authorization", "Bearer " + this.apiSrv.token.access);
        const serverUri = this.apiSrv.getServer();
        try {
            return await this.httpClient
                .post<any>(serverUri + "/api/image/" + imageType, this.formData, { headers: headers })
                .toPromise();
        } catch (e) {
            if ((e.status !== 401 && e.status !== 403) || tries === 0) throw e;

            try {
                await this.apiSrv.refresh();
                return this.uploadImages(imageType, --tries);
            } catch (e) {
                throw e;
            }
        }
    }
}
