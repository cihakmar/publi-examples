import { NgModule } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import { PayPage } from "./pay.page";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { ComponentsModule } from "../../../../components/components.module";
import { PipesModule } from "../../../../pipes/pipes.module";
import { PayPageRoutingModule } from "./pay-routing.module";

@NgModule({
    imports: [
        CommonModule,
        IonicModule,
        TranslateModule.forChild(),
        PayPageRoutingModule,
        ComponentsModule,
        PipesModule
    ],

    declarations: [PayPage]
})
export class PayPagePageModule {
}
