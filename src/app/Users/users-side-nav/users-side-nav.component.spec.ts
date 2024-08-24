import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersSideNavComponent } from './users-side-nav.component';

describe('UsersSideNavComponent', () => {
  let component: UsersSideNavComponent;
  let fixture: ComponentFixture<UsersSideNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UsersSideNavComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsersSideNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
