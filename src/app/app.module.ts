import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { TwilioService } from './twilio/services/twilio.service';
import { AppComponent } from './app.component';
import { TwilioComponent } from './twilio/twilio.component';
import { FormsModule } from "@angular/forms";
import { Routes, RouterModule } from '@angular/router';
import { WaitingComponent } from './waiting/waiting.component';

const routes: Routes = [{ path: 'video', component: TwilioComponent },
{path: 'waiting', component: WaitingComponent}
]; 
@NgModule({
  declarations: [
    AppComponent,
    TwilioComponent,
    WaitingComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    [RouterModule.forRoot(routes)],
    
  ], 
  providers: [TwilioService],
  bootstrap: [AppComponent],
  exports: [RouterModule]
})
export class AppModule { }
