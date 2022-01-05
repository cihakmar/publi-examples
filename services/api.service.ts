import { Injectable } from "@angular/core";
import { Storage } from "@ionic/storage";
import { LogRequest } from "../models/logRequest";
import { AccessTokenRequest } from "../models/accessToken/accessTokenRequest";
import { AccessTokenResponse } from "../models/accessToken/accessTokenResponse";
import { GeoService } from "./geo.service";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { timeout } from "rxjs/operators";
import { Token } from "../models/token";
import { EventsService } from "./events.servise";
import { RefreshTokenRequest } from "../models/accessToken/refreshTokenRequest";
import { RefreshTokenResponse } from "../models/accessToken/refreshTokenResponse";

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private defaultServer = "https://***.******.****";
    private timeOut = 20000;

    public server: string;
    public username: string;

    public token: Token = {
        refresh: null,
        access: null
    };
    public refreshPromise: Promise<string>;

    public constructor(
        private http: HttpClient,
        private storage: Storage,
        private geoSrv: GeoService,
        private eventsSrv: EventsService
    ) {
    }

    public async init() {
        await this.loadToken();
        this.parseUsername(await this.storage.get("username"));
    }

    public get logged(): boolean {
        return !!this.token.refresh;
    }

    public async login(username: string, password: string): Promise<void> {
        try {
            const login = this.parseUsername(username);
            const data = await this.send<AccessTokenResponse>("POST", "/api/login", null, {
                login,
                password
            } as AccessTokenRequest);

            if (!!data.refresh_token && !!data.access_token) {
                await this.saveToken(data.refresh_token, data.access_token);
                this.eventsSrv.sendLoginEvent({
                    data
                });
            } else {
                throw false;
            }
        } catch (e) {
            throw false;
        }
    }

    private async logToServer(type: string, sender: string, message: string): Promise<void> {
        const logRequest = {
            type: "error",
            sender: "api.ts",
            message,
            device: null,
            model: null,
            platform: null,
            version: null
        } as LogRequest;

        await this.send("POST", "/api/log", null, logRequest);
    }

    public async logout(): Promise<void> {
        this.server = null;
        try {
            await this.saveToken(null, null);
        } catch (e) {
            this.logToServer("error", "api.ts, load", e);
        }
        this.eventsSrv.sendLogoutEvent({});
    }

    public refresh(): Promise<string> {
        if (!!this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = new Promise<string>(async (resolve, reject) => {
            try {
                if (!this.token.refresh) {
                    throw new Error("No refresh token");
                }

                const fullPath = `${this.getServer()}/api/refresh`;
                const options = {
                    body: {
                        grant_type: "refresh_token",
                        refresh_token: this.token.refresh
                    } as RefreshTokenRequest
                };
                const response: RefreshTokenResponse = await this.http
                    .request<RefreshTokenResponse>(
                        "POST",
                        fullPath,
                        options
                    ).pipe(timeout(this.timeOut))
                    .toPromise();
                await this.saveToken(this.token.refresh, response.access_token);
                this.refreshPromise = null;
                resolve(response.access_token);
            } catch (e) {
                this.logToServer("error", "api.ts, refresh", e);
                await this.logout();
                this.refreshPromise = null;
                reject();
            }
        });
        return this.refreshPromise;
    }

    private async request(method: string, path: string, options): Promise<any> {
        let tries = 3;
        while (tries-- >= 0) {
            try {
                if (this.logged && !this.token.access) {
                    const accessToken = await this.refresh();
                    this.token.access = accessToken;
                }

                if (this.token && !!this.token.access) {
                    options.headers = options.headers.set("Authorization", "Bearer " + this.token.access);
                }

                if (this.geoSrv.available) {
                    options.headers = options.headers.set("X-Device-Lng", this.geoSrv.longitude.toString());
                    options.headers = options.headers.set("X-Device-Lat", this.geoSrv.latitude.toString());
                }

                const fullPath = `${this.getServer()}${path}`;
                const response = await this.http.request(method, fullPath, options).pipe(timeout(this.timeOut)).toPromise();
                return response;

            } catch (e) {
                if (e && e.status !== 401 && e.status !== 403) {
                    throw e;
                } else {
                    this.token.access = null;
                }
            }
        }
    }

    public async send<T>(
        method: string,
        path: string,
        search: URLSearchParams | any = null,
        body: any = null
    ): Promise<T> {
        const options = {
            body,
            headers: new HttpHeaders(),
            params: {
                search
            }
        };
        return await this.request(method, path, options);
    }

    // Server

    /** Returns server uri */
    public getServer() {
        if (this.server) {
            return this.getServers()[this.server];
        }

        return this.defaultServer;
    }

    /** Returns list of known app servers */
    public getServers() {
        return {
            dev: "https://***.******.****",
            test: "https://****.******.****",
            stage: "https://*****.******.****",
            local: "http://localhost:8080",
        };
    }

    /**
     * @description Returns username and set this.server property to suffix server identifier
     * @param username contain user info
     */
    public parseUsername(username: string) {
        this.username = username;
        this.storage.set("username", username);
        for (const server in this.getServers()) {
            if (!username || username.indexOf("." + server, username.length - server.length - 1) === -1) {
                continue;
            }

            this.server = server;
            return username.substr(0, username.length - (server.length + 1));
        }

        this.server = null;
        return username;
    }

    private async loadToken() {
        try {
            this.token = new Token(null, null);
            this.token.refresh = await this.storage.get("refreshToken");
        } catch (e) {
            this.logToServer("error", "api.ts, loadToken", e);
        }
    }

    private async saveToken(refresh: string, access: string) {
        try {
            this.token = new Token(refresh, access);
            console.log("SAVE TOKEN: ", JSON.stringify(this.token));
            await this.storage.set("refreshToken", this.token.refresh);
        } catch (e) {
            this.logToServer("error", "api.ts, saveToken", e);
        }
    }

    public getFormData(params: object) {
        const fd = new FormData();
        for (const i in params) {
            if (params.hasOwnProperty(params[i])) {
                fd.append(i, params[i]);
            }
        }
        return fd;
    }
}
