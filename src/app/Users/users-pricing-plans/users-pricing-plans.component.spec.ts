import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersPricingPlansComponent } from './users-pricing-plans.component';

describe('UsersPricingPlansComponent', () => {
  let component: UsersPricingPlansComponent;
  let fixture: ComponentFixture<UsersPricingPlansComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UsersPricingPlansComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsersPricingPlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
