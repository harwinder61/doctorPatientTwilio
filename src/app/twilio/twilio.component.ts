import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { userInfo } from 'os';
import { Observable } from 'rxjs/Rx';
import { TwilioService } from './services/twilio.service';

// import * as Video from 'twilio-video';;

@Component({
  selector: 'app-twilio',
  templateUrl: './twilio.component.html',
  styleUrls: ['./twilio.component.css']
})
export class TwilioComponent implements OnInit {

  message: string;
  alertMessage: string;
  accessToken: string;
  roomName: string;
  username: string;
  doctorName: any;
  userType:any;
  showMsg: boolean = false;
  hasPermission=false;
  @ViewChild('localVideo') localVideo: ElementRef;
  @ViewChild('remoteVideo') remoteVideo: ElementRef;

  constructor(private twilioService: TwilioService) {
    this.twilioService.msgSubject.subscribe(r => {
      this.message = r;
    });
    
  }


  ngOnInit() {
    this.twilioService.localVideo = this.localVideo;
    this.twilioService.remoteVideo = this.remoteVideo;
    var url=window.location.href;

   if(url){
     var params=url.split('chat');
     let searchParams = new URLSearchParams(window.location.search)
     
     if(searchParams){
      //  var queryData=params[1].split('/');
      //  if(queryData&&queryData.length>3){
        this.hasPermission=true;
        var val=new Date().valueOf();
        this.userType = searchParams.get('userType') // doctor or patient
        this.doctorName  = searchParams.get('docId')
        const patientName = searchParams.get('patientId')
        this.roomName = 'room_'+this.doctorName + patientName
        this.username = (this.userType == 'd' ) ? this.doctorName : patientName; 
        this.createSyncToken();
        const userDetails = {userType:this.userType,doctorName:this.doctorName,patientName:patientName,roomName:this.roomName,userName:this.username};
        localStorage.setItem('userDetails', JSON.stringify(userDetails));
        
      //  }       
     }
  }
   
   this.twilioService.chatConnectedEmitter.subscribe((msg) => {
     this.alertMessage = msg;
      this.showMsg= true;
      setTimeout(()=>{                          
        this.showMsg = false;
   }, 6000);
   })
  }
  
  log(message) {
    this.message = message;
  }
  createSyncToken(){
    const mapUserId = this.doctorName;
    const userId = this.username;
    console.log(mapUserId , '-----' , userId)
    this.twilioService.createSyncToken(userId , mapUserId).subscribe((data)=>{
      console.log('6363')
      this.twilioService.connectSync(data.token , mapUserId, this.userType).then(()=>{
        this.connect(this.username,this.roomName);
      })
     
    });
  }
  disconnect() {
    console.log(this.twilioService.roomObj);
    
    if (this.twilioService.roomObj && this.twilioService.roomObj !== null) {
      const roomId = this.twilioService.roomObj.sid;
      this.twilioService.completeRoom(roomId).subscribe();
      this.twilioService.roomObj.disconnect();
      this.twilioService.roomObj = null;
    }
  }

  connect(username, roomName): void {
    console.log(roomName , username)
    
    let storage = JSON.parse(localStorage.getItem('token') || '{}');
    storage = {};
    let date = Date.now();
    if (!roomName || !username) { this.message = "enter username and room name."; return;}
    if (storage['token'] && storage['created_at'] + 3600000 > date) {
      this.accessToken = storage['token'];
      this.twilioService.connectToRoom(this.accessToken, { name: roomName, audio: true, video: { width: 240 } }) 
      return;
    }
    this.twilioService.getToken(username ,roomName).subscribe(d => {
      this.accessToken = d['token'];
      localStorage.setItem('token', JSON.stringify({
        token: this.accessToken,
        created_at: date
      }));
      //  { name: this.roomName, audio: true, video: { width: 240 } , logLevel: 'debug'}
      this.twilioService.connectToRoom(this.accessToken , {  logLevel: 'off'})
    },
      error => this.log(JSON.stringify(error)));

  }
 
}
