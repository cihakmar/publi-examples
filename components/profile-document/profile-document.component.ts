import { Component, Input } from "@angular/core";
import { ProfileResponse } from "../../models/profileResponse";

@Component({
    templateUrl: "profile-document.component.html",
    selector: "app-profile-document",
})
export class ProfileDocumentComponent {
    @Input() public imageType: number;
    @Input() public uploading: boolean;
    @Input() public profile: ProfileResponse;

    public imageSource(imageType) {
        if (this.profile && this.profile[`image${imageType}_status`] === "uploaded")
            return this.profile && this.profile["image" + imageType];
        return null;
    }
}
