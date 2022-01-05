import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";
import { TaxameterPage } from "./taxameter.page";

describe("TaxameterPage", () => {
    let component: TaxameterPage;
    let fixture: ComponentFixture<TaxameterPage>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [TaxameterPage],
            imports: [IonicModule.forRoot(), RouterModule.forRoot([])]
        }).compileComponents();

        fixture = TestBed.createComponent(TaxameterPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
