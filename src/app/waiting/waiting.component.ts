import { Component, OnInit } from "@angular/core";
import { PatternValidator } from "@angular/forms";
import { userInfo } from "os";
import { TwilioService } from "../twilio/services/twilio.service";

@Component({
  selector: "app-waiting",
  templateUrl: "./waiting.component.html",
  styleUrls: ["./waiting.component.css"],
})
export class WaitingComponent implements OnInit {
  waitingList: any;
  public syncDocObject: any;
  public syncClient: any;
  syncMapObject: any;
  userDetails: any;

  constructor(private twilioService: TwilioService) {}
  populateWaitingUsers(){
    let waitingList = [];
    this.twilioService.syncMapObject.then((map) => {
      map
      .getItems()
      .then( (page)=>  {
        page.items.map((user) => {
          console.log(user.key , user.value.status);
          const str = user.key;
          const res = str.split("_");
          const currentUser = res[0];
          const mapUserId = res[1]
          if (user.value.status && currentUser != mapUserId) {
            waitingList.push({userId:currentUser,currentUserId:this.userDetails.doctorName})
            
          }
        });
      })
      .then(() => {
        this.waitingList = waitingList;
      });
    });
  }
  ngOnInit() {
    this.userDetails = JSON.parse(localStorage.getItem("userDetails"));
    console.log(this.userDetails);
    let waitingList = [];
    this.createSyncToken().then(() => {
      this.twilioService.syncMapObject.then((map) => {
        map.on('itemAdded', (item) => {
          console.log('key', item.key);
          this.populateWaitingUsers();
          console.log('JSON data', item.value);
        });
        map.on('itemUpdated', (item) => {
          this.populateWaitingUsers();
          console.log('key', item.key);
          console.log('JSON data', item.value);
        });
      
        this.populateWaitingUsers();
      });
      
    });
  }
  

  createSyncToken() {
    return new Promise((resolve: any, reject: any) => {
      const mapUserId = this.userDetails.doctorName;
      const userId = this.userDetails.userName;
      console.log(mapUserId , '-----' , userId)
      this.twilioService.createSyncToken(userId,mapUserId).subscribe((data) => {
        console.log("6363", data.token);
        this.twilioService
          .connectSync(data.token, userId, this.userDetails.userType)
          .then(() => {
            // this.connect(this.username,this.roomName);
            return resolve(true);
          });
      });
    });
  }
}
