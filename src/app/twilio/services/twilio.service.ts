import { Injectable, EventEmitter, ElementRef } from "@angular/core";
import { Router } from "@angular/router";
import {
  HttpClientModule,
  HttpClient,
  HttpHeaders,
} from "@angular/common/http";
import { Observable } from "rxjs/Observable";
import { Observer } from "rxjs";
import {
  connect,
  createLocalTracks,
  createLocalVideoTrack,
} from "twilio-video";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { SyncClient } from "twilio-sync";
import { userInfo } from "os";

@Injectable()
export class TwilioService {
  remoteVideo: ElementRef;
  localVideo: ElementRef;
  previewing: boolean;
  msgSubject = new BehaviorSubject("");
  roomObj: any;
  userName: any;
  userType: any;
  mapUserId: any;
  userDetails: any;
  talking: boolean;

  public syncDocObject: any;
  public syncMapObject: any;
  public syncClient: any;
  alertMessage: string;
  showMsg: boolean = false;
  public chatConnectedEmitter: EventEmitter<any> = new EventEmitter<any>();
  constructor(private http: HttpClient, private router: Router) {}

  getToken(username, roomName): Observable<any> {
    this.userName = username;
    return this.http.post("https://c0cd914250f6.ngrok.io/room/create", {
      room_name: roomName,
      identity: username,
    });
  }

  createSyncToken(userId, mapUserId): Observable<any> {
    this.mapUserId = mapUserId;
    return this.http.post(
      "https://c0cd914250f6.ngrok.io/room/createSyncToken",
      {
        userId: userId,
        mapUserId: mapUserId
      }
    );
  }

  connectSync(token: any, currentUserId: any, userType: any) {
    this.userType = userType;
    const connectionPromise = new Promise((resolve: any) => {
      this.syncClient = new SyncClient(token);
      console.log(currentUserId);
      this.callSynFunction(currentUserId).then((res) => {
        return resolve();
      });
    });
    return connectionPromise;
  }
  callSynFunction(userId) {
    return new Promise((resolve: any, reject: any) => {
      const data = JSON.parse(localStorage.getItem("userDetails"));
      const mapKey = data.userName+'_'+this.mapUserId;
      console.log(data);
      this.userDetails = data;
      this.userDetails.mapKey = mapKey;
      this.syncMapObject = this.syncClient.map("waiting_users4"+userId).then((map) => {
        console.log("in map ", this.router.url);
        if (data.userType != "d" && this.router.url == "/waiting") {
          console.log("in map ", this.router.url);
          if (data) {
            console.log("data.userName", mapKey);
            map
              .get(mapKey)
              .then(function (item) {
                console.log("get value ", item.value);
              })
              .catch((e) => {
                map
                  .set(mapKey, {
                    status: false,
                  })
                  .then(function (item) {
                    console.log("Added: ", item.key);
                  })
                  .catch(function (err) {
                    console.error(err);
                  });
              });
          }
        }
        return map;
      });

      this.syncMapObject
        .then((updateResult) => {
          console.log("in update 84");
          this.initializeSyncDoc(userId).then(()=>{
            return resolve();
          })
        })
        .catch((error) => {
          console.log("errorrr", error);
          return reject();
        });
    });
  }
  initializeSyncDoc(userId) {  
    return new Promise((resolve: any, reject: any) => {
      console.log("documetn name  is updated" , "documenttwilio" + userId);
      this.syncDocObject = this.syncClient
        .document("documenttwilio" + userId)
        .then((document) => {
          document.on("updated", (event) => {
            
            if (this.userType == "d") {
              if(!this.talking){
              this.chatConnectedEmitter.emit(event.value.DocMessage);
              }
            } else {
              this.chatConnectedEmitter.emit(event.value.universalMessage);
            }
          });
          this.chatConnectedEmitter.emit("You are connected!");
          return document;
        });
      this.syncDocObject
        .then((updateResult) => {
          console.log("synch document is initialized ");
          return resolve();
        })
        .catch((error) => {
          return reject();
        });
    });
  } 
  completeRoom(roomId): Observable<any> {
    return this.http.post(
      "https://c0cd914250f6.ngrok.io/room/complete",
      { roomId: roomId }
    );
  }
  updateUserSyncStatus(status) {
    
    this.syncMapObject.then((map) => {
      console.log("in map ", this.router.url);
      if (this.userDetails) {
        console.log("this.userDetails.userName", this.userDetails.mapKey);
        // map.get(this.userDetails.userName).then(function(item) {
        // console.log('get value ',item.value);
        //}).catch((e)=>{
        map
          .set(this.userDetails.mapKey, {
            status: status,
          })
          .then(function (item) {
            console.log("status setup after call for patient");
          })
          .catch(function (err) {
            console.error(err);
          });
        // })//
      }
    });
  }
  connectToRoom(accessToken: string, options): void {
    connect(accessToken, options).then((room) => {
      this.roomObj = room;
      this.syncDocObject.then((doc) => {
        console.log("this.userType", this.userType);
        if (this.userType == "d") {
          doc.update({
            universalMessage:
              "Doc " + this.userName + " is talking with someone",
          });
        } else {
          this.updateUserSyncStatus(true);
          doc
            .update({
              DocMessage: "Patient " + this.userName + " is waiting you",
            })
            .then(() => {
              console.log("patient message is udpated");
            });
        }
      });

      if (!this.previewing) {
        //this.startLocalVideo();
        var tracks = Array.from(room.localParticipant.tracks.values());
        tracks.forEach((track: any) => {
          this.localVideo.nativeElement.appendChild(track.track.attach());
        });
        this.previewing = true;
      }

      room.participants.forEach((participant) => {
        // this.msgSubject.next("Already in Room: '" + participant.identity + "'");
        console.log("Already in Room: '" + participant.identity + "'");
        //this.attachParticipantTracks(participant);
      });

      room.on("participantDisconnected", (participant) => {
        // this.msgSubject.next("Participant '" + participant.identity + "' left the room");
        // console.log("Participant '" + participant.identity + "' left the room");

        this.detachParticipantTracks(participant);
      });

      room.on("participantConnected", (participant) => {
        console.log("participant conneccted ");
        this.talking = true;
        this.syncMapObject.then((map) => {
          console.log("in map ");
          if (this.userDetails.userType != "d") {
            if (this.userDetails) {
              console.log("data.userName", this.userDetails.mapKey);
              map.set(this.userDetails.mapKey, {
                status: false,
              });
            }
          }
        });

        participant.tracks.forEach((track) => {
          // this.remoteVideo.nativeElement.appendChild(track.attach());
        });

        participant.on("trackSubscribed", (track) => {
          console.log("track added");
          this.talking = true;
          this.syncMapObject.then((map) => {
            console.log("in map ");
            if (this.userDetails.userType != "d") {
              if (this.userDetails) {
                console.log("data.userName", this.userDetails.mapKey);
                map.set(this.userDetails.mapKey, {
                  status: false,
                });
              }
            }
          });
          this.remoteVideo.nativeElement.appendChild(track.attach());
          document
            .getElementById("remote-media-div")
            .appendChild(track.attach());
        });
      });

      // When a Participant adds a Track, attach it to the DOM.
      room.on("trackSubscribed", (track, participant) => {
        this.talking = true;
        this.syncMapObject.then((map) => {
          console.log("in map ");
          if (this.userDetails.userType != "d") {
            if (this.userDetails) {
              console.log("data.userName", this.userDetails.mapKey);
              map.set(this.userDetails.mapKey, {
                status: false,
              });
            }
          }
        });
        console.log(participant.identity + " added track: " + track.kind);
        this.attachTracks([track]);
      }); 

      // When a Participant removes a Track, detach it from the DOM.
      room.on("trackRemoved", (track, participant) => {
        console.log(participant.identity + " removed track: " + track.kind);
        this.detachTracks([track]);
      });

      room.once("disconnected", (room) => {
        this.talking = false;
        this.syncDocObject.then((doc) => {
          console.log(this.userType);
          if (this.userType == "d") {
            doc.update({ DocMessage: "" });
          } else {
            this.updateUserSyncStatus(false);
            doc.update({ universalMessage: "" });
          }
        });

        this.syncMapObject.then((map) => {
          console.log("in map ");
          if (this.userDetails.userType != "d") {
            if (this.userDetails) {
              
              map.get(this.userDetails.mapKey).then((item) => {
                console.log("get value ", item.value);
                map.remove(this.userDetails.mapKey);
              });
            }
          }
        });

        this.previewing = false;
        console.log(room);
        this.localVideo.nativeElement.innerHTML = "";
        this.remoteVideo.nativeElement.innerHTML = "";
        // this.msgSubject.next('You left the Room:' + room.name);
        room.localParticipant.tracks.forEach((track) => {
          var attachedElements = track.track.detach();
          attachedElements.forEach((element) => element.remove());
        });
      });
    });
  }

  attachParticipantTracks(participant): void {
    var tracks = Array.from(participant.tracks.values());
    this.attachTracks([tracks]);
  }

  attachTracks(tracks) {
    tracks.forEach((track) => {
      this.remoteVideo.nativeElement.appendChild(track.attach());
    });
  }

  startLocalVideo(): void {
    createLocalVideoTrack().then((track) => {
      this.localVideo.nativeElement.appendChild(track.attach());

      // this.localVideo.nativeElement.appendChild(track.attach()).classList.add('md-video');

      // this.localVideo.nativeElement.ViewChild.v
    });
  }

  localPreview(): void {
    createLocalVideoTrack().then((track) => {
      this.localVideo.nativeElement.appendChild(track.attach());
    });
  }

  detachParticipantTracks(participant) {
    var tracks = Array.from(participant.tracks.values());
    this.detachTracks(tracks);
  }

  detachTracks(tracks): void {
    tracks.forEach(function (track) {
      track.detach().forEach(function (detachedElement) {
        detachedElement.remove();
      });
    });
  }
}
