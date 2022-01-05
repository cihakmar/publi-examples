import { NgModule } from "@angular/core";
import { TaxameterPage } from "./taxameter.page";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { TranslateModule } from "@ngx-translate/core";
import { ComponentsModule } from "../../../../components/components.module";
import { PipesModule } from "../../../../pipes/pipes.module";
import { TaxameterPageRoutingModule } from "./taxameter-routing.module";

@NgModule({
    imports: [
        CommonModule,
        IonicModule,
        TranslateModule.forChild(),
        TaxameterPageRoutingModule,
        ComponentsModule,
        PipesModule
    ],
    declarations: [TaxameterPage],
})
export class TaxameterPageModule {}
