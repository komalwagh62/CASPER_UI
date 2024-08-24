import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersrequestServiceComponent } from './usersrequest-service.component';

describe('UsersrequestServiceComponent', () => {
  let component: UsersrequestServiceComponent;
  let fixture: ComponentFixture<UsersrequestServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UsersrequestServiceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsersrequestServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
