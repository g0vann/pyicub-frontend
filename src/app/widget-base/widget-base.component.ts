import {Component, inject, Input} from '@angular/core';
import {ApiService} from "../services/api/api.service";
import {ICubEmoPart} from "../types/ICubEmoPart";
import {ICubEmoEmotion} from "../types/ICubEmoEmotion";
import {ICubEmoColor} from "../types/ICubEmoColor";
import {Application} from "../types/Application";
import {AppStateService} from "../services/app-state.service";
import {Plugin} from "../types/Plugin";

@Component({
  selector: 'app-widget-base',
  templateUrl: './widget-base.component.html',
  styleUrl: './widget-base.component.css'
})
export class WidgetBaseComponent {

  @Input()
  application: Application;

  @Input()
  plugin: Plugin;

  @Input()
  width?: number

  @Input()
  height?: number

  protected apiService = inject(ApiService);
  protected appStateService = inject(AppStateService);

  getApplicationFSM() {
    return this.apiService.getApplicationFSM(this.application.robotName, this.application.name, this.application.url.port)
  }

  checkAsyncRequestStatus(requestID: string, initCallback: () => void = () => {
  }, runningCallback: () => void = () => {
  }, doneCallback: (retval: any) => void = () => {
  }, failedCallback: () => void = () => {
  },timeoutCallback: () => void = () => {
  }) {
    return this.apiService.checkAsyncRequestStatus(requestID, initCallback, runningCallback, doneCallback, failedCallback,timeoutCallback)
  }

  runService(serviceName: string, body: any) {
    return this.apiService.runService(this.application.robotName, this.application.name, this.application.url.port, serviceName, body)
  }

  runServiceAsync(serviceName: string, body: any = {}) {
    return this.apiService.runServiceAsync(this.application.robotName, this.application.name, this.application.url.port, serviceName, body)
  }

  fsmGetCurrentState() {
    return this.apiService.fsmGetCurrentState(this.application.robotName, this.application.name, this.application.url.port)
  }

  fsmGetCurrentProcess() {
    return this.apiService.fsmGetCurrentProcess()
  }

  fsmRunStep(trigger: string) {
    return this.apiService.runServiceAsync(this.application.robotName, this.application.name, this.application.url.port, "fsm.runStep", {trigger: trigger})
  }

  getRobotActions() {
    return this.apiService.getRobotActions(this.application.robotName)
  }

  playActionSync(actionID: string) {
    return this.apiService.playActionSync(this.application.robotName, actionID)
  }

  playActionAsync(actionID: string) {
    return this.apiService.playActionAsync(this.application.robotName, actionID)
  }

  emoAngry() {
    return this.apiService.emoAngry(this.application.robotName)
  }

  emoClosingEyes() {
    return this.apiService.emoClosingEyes(this.application.robotName)
  }

  emoCun() {
    return this.apiService.emoCun(this.application.robotName)
  }

  emoEbSmile() {
    return this.apiService.emoEbSmile(this.application.robotName)
  }

  emoEbSurprised() {
    return this.apiService.emoEbSurprised(this.application.robotName)
  }

  emoEvil() {
    return this.apiService.emoEvil(this.application.robotName)
  }

  emoNeutral() {
    return this.apiService.emoNeutral(this.application.robotName)
  }

  emoOpeningEyes() {
    return this.apiService.emoOpeningEyes(this.application.robotName)
  }

  emoSad() {
    return this.apiService.emoSad(this.application.robotName)
  }

  emoSendCmd(part: ICubEmoPart, emotion: ICubEmoEmotion) {
    return this.apiService.emoSendCmd(this.application.robotName, part, emotion)
  }

  emoSetBrightness(brightness: 0 | 1 | 2 | 3 | 4 | 5) {
    return this.apiService.emoSetBrightness(this.application.robotName, brightness)
  }

  emoSetColor(color: ICubEmoColor) {
    return this.apiService.emoSetColor(this.application.robotName, color)
  }

  emoSmile() {
    return this.apiService.emoSmile(this.application.robotName)
  }

  emoSurprised() {
    return this.apiService.emoSurprised(this.application.robotName)
  }

  gazeBlockEyes(vergence: number) {
    return this.apiService.gazeBlockEyes(this.application.robotName, vergence)
  }

  gazeBlockNeck() {
    return this.apiService.gazeBlockNeck(this.application.robotName)
  }

  gazeClearEyes() {
    return this.apiService.gazeClearEyes(this.application.robotName)
  }

  gazeClearNeck() {
    return this.apiService.gazeClearNeck(this.application.robotName)
  }

  gazeInit() {
    return this.apiService.gazeInit(this.application.robotName)
  }

  gazeLookAtAbsAngles(azimuth: number, elevation: number, vergence: number, waitMotionDone: boolean = true, timeout: number = 0.0) {
    return this.apiService.gazeLookAtAbsAngles(this.application.robotName, azimuth, elevation, vergence, waitMotionDone, timeout)
  }

  gazeLookAtFixationPoint(x: number, y: number, z: number, waitMotionDone: boolean = true, timeout: number = 0.0) {
    return this.apiService.gazeLookAtFixationPoint(this.application.robotName, x, y, z, waitMotionDone, timeout)
  }

  gazeLookAtRelAngles(azimuth: number, elevation: number, vergence: number, waitMotionDone: boolean = true, timeout: number = 0.0) {
    return this.apiService.gazeLookAtRelAngles(this.application.robotName, azimuth, elevation, vergence, waitMotionDone, timeout)
  }

  gazeReset() {
    return this.apiService.gazeReset(this.application.robotName)
  }

  gazeSetParams(neck_tt: number, eyes_tt: number) {
    return this.apiService.gazeSetParams(this.application.robotName, neck_tt, eyes_tt)
  }

  gazeSetTrackingMode(mode: boolean) {
    return this.apiService.gazeSetTrackingMode(this.application.robotName, mode)
  }

  gazeWaitMotionDone(period: number = 0.1, timeout: number = 0) {
    return this.apiService.gazeWaitMotionDone(this.application.robotName, period, timeout)
  }

  gazeWaitMotionOnset(speedRef: number = 0, period: number = 0.1, maxAttempts: number = 50) {
    return this.apiService.gazeWaitMotionOnset(this.application.robotName, speedRef, period, maxAttempts)
  }

  speechClose() {
    return this.apiService.speechClose(this.application.robotName)
  }

  speechSay(sentence: string, waitActionDone: boolean = true) {
    return this.apiService.speechSay(this.application.robotName, sentence, waitActionDone)
  }

  speechSayAsync(sentence: string, waitActionDone: boolean = true) {
    return this.apiService.speechSayAsync(this.application.robotName, sentence, waitActionDone)
  }

  llmQueryAsync(sentence: string) {
    return this.apiService.llmQueryAsync(this.application.robotName, sentence)
  }


  camLeftGetURI() {
    return this.apiService.camLeftGetURI(this.application.robotName)
  }

  camRightGetURI() {
    return this.apiService.camRightGetURI(this.application.robotName)
  }

  camLeftGetImgRes() {
    return this.apiService.camLeftGetImgRes(this.application.robotName)
  }

  camRightGetImgRes() {
    return this.apiService.camRightGetImgRes(this.application.robotName)
  }

  getApplicationServices(){
    return this.apiService.getServices(this.application.robotName,this.application.name)
  }

  fsmGetFull() {
    return this.apiService.fsmGetFull(this.application.robotName, this.application.name, this.application.url.port);
  }

  fsmLoad(fsmData: any) {
    return this.apiService.fsmLoad(this.application.robotName, this.application.name, this.application.url.port, fsmData);
  }
}
