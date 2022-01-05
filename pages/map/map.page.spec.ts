import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";
import { MapPage } from "./map.page";

describe("MapPage", () => {
    let component: MapPage;
    let fixture: ComponentFixture<MapPage>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [MapPage],
            imports: [IonicModule.forRoot(), RouterModule.forRoot([])]
        }).compileComponents();

        fixture = TestBed.createComponent(MapPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
