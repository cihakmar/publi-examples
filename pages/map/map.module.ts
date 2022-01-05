import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";


import { ComponentsModule } from "../../../components/components.module";
import { TranslateModule } from "@ngx-translate/core";
import { IonicModule } from "@ionic/angular";
import { MapPageRoutingModule } from "./map-routing.module";
import { MapPage } from "./map.page";


@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        IonicModule,
        TranslateModule.forChild(),
        MapPageRoutingModule,
        ComponentsModule
    ],

    declarations: [MapPage]
})
export class MapPageModule {
}
