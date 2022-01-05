import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { TaxameterPage } from "./taxameter.page";


const routes: Routes = [
    {
        path: "",
        component: TaxameterPage
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class TaxameterPageRoutingModule {
}
