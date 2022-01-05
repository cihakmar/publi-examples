import { Injectable } from "@angular/core";
import { InAppBrowser } from "@ionic-native/in-app-browser/ngx";

@Injectable({
    providedIn: 'root'
})
export class GatewayService {
    public constructor(private browser: InAppBrowser) {}

    public async pay(url: string): Promise<object> {
        return new Promise((resolve) => {
            const browser = this.browser.create(url, "_blank", "location=no");
            browser.on("exit").subscribe(() => resolve());
            browser.on("loadstart").subscribe((event) => {
                //pri kazdem nacteni nove url se udela tato metoda
                const index = event.url.indexOf("revolt.city");
                if (index !== -1 && index < 20 && event.url.indexOf("/GoPay/") === -1) browser.close();
            });
        });
    }

    public async verification(url): Promise<object> {
        return new Promise((resolve) => {
            const browser = this.browser.create(url, "_system", "location=yes");
            browser.on("exit").subscribe(() => resolve());
            browser.on("loadstart").subscribe((event) => {
                console.log(event);
            });
        });
    }
}
