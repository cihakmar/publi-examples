import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { Storage } from "@ionic/storage";

@Injectable({
    providedIn: 'root'
})
export class TranslatorService {
    public languages = {
        cs: "Česky",
        en: "English"
    };
    public languagesEnum = {
        cs: 0,
        en: 1
    };

    public constructor(
        private service: TranslateService,
        private storage: Storage
    ) {
    }

    public get change() {
        return this.service.onLangChange;
    }

    public get current() {
        return this.service.currentLang;
    }

    public get currentEnum() {
        return this.languagesEnum[this.current];
    }

    public get keys() {
        return Object.keys(this.languages);
    }

    public async init() {
        this.service.setDefaultLang(this.keys[0]);

        const storageLang = await this.storage.get("language");
        let usedLang;
        if (storageLang !== this.keys.indexOf(this.service.getBrowserLang())) {
            if (this.keys.indexOf(this.service.getBrowserLang()) === -1 && this.service.getBrowserLang() !== "sk") {
                usedLang = this.keys[1];
            } else if (
                this.keys.indexOf(this.service.getBrowserLang()) === -1 &&
                this.service.getBrowserLang() === "sk"
            ) {
                usedLang = this.keys[0];
            } else {
                usedLang = this.keys[this.keys.indexOf(this.service.getBrowserLang())];
            }
        } else {
            usedLang = storageLang;
        }
        this.use(usedLang);
    }

    public async use(language) {
        await this.storage.set("language", language);
        this.service.use(language);
    }

    public async trans(message, params?: any) {
        return this.service.get(message, params).toPromise();
    }
}
