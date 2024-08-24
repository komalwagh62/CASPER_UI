import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersNOCASComponent } from './users-nocas.component';

describe('UsersNOCASComponent', () => {
  let component: UsersNOCASComponent;
  let fixture: ComponentFixture<UsersNOCASComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UsersNOCASComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsersNOCASComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
