import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {GridsterModule} from 'angular-gridster2';
import {AppRoutingModule} from './routing/app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {HomePageComponent} from './home-page/home-page.component';
import {RobotCellComponent} from './robot-cell/robot-cell.component';
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatButtonModule} from "@angular/material/button";
import {ApplicationsPageComponent} from './applications-page/applications-page.component';
import {HttpClientModule} from "@angular/common/http";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {AppbarRobotCellComponent} from './appbar-robot-cell/appbar-robot-cell.component';
import {ApplicationPageComponent} from './application-page/application-page.component';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatCardModule} from '@angular/material/card';
import {MatMenuModule} from '@angular/material/menu';
import {AppbarApplicationCellComponent} from './appbar-application-cell/appbar-application-cell.component';
import {FsmComponent} from './plugins/fsm/fsm.component';
import {WidgetBaseComponent} from './widget-base/widget-base.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {DashboardComponent} from './dashboard/dashboard.component';
import {PluginDialogComponent} from './plugin-dialog/plugin-dialog.component';
import {MatDialogModule} from "@angular/material/dialog";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {ApplicationArgsDialogComponent} from './application-args-dialog/application-args-dialog.component';
import {MatInputModule} from "@angular/material/input";
import {RobotCamViewerComponent} from './plugins/robot-cam-viewer/robot-cam-viewer.component';
import {RobotSpeechComponent} from './plugins/robot-speech/robot-speech.component';
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {GraphyComponent} from './graphy/graphy.component';
import {DefsTemplateDirective, EdgeTemplateDirective, NodeTemplateDirective} from './graphy/templates';
import { ActionsManagerComponent } from './plugins/actions-manager/actions-manager.component';
import { WidgetErrorDialogComponent } from './widget-error-dialog/widget-error-dialog.component';
import {MatTooltipModule} from "@angular/material/tooltip";
import { SavedDashboardDialogComponent } from './saved-dashboard-dialog/saved-dashboard-dialog.component';
import { RestoreSessionDialogComponent } from './restore-session-dialog/restore-session-dialog.component';
import {MatExpansionModule} from "@angular/material/expansion";
import { ServicesManagerComponent } from './plugins/services-manager/services-manager.component';
import { DashboardFullDialogComponent } from './dashboard-full-dialog/dashboard-full-dialog.component';
import { PopoverDirective } from './common/popover/popover.directive';
import { LlmChatboxComponent } from './plugins/llm-chatbox/llm-chatbox.component';
import { FrancolinoComponent } from './plugins/francolino/francolino.component';

@NgModule({
  declarations: [
    AppComponent,
    HomePageComponent,
    RobotCellComponent,
    ApplicationsPageComponent,
    AppbarRobotCellComponent,
    ApplicationPageComponent,
    AppbarApplicationCellComponent,
    FsmComponent,
    WidgetBaseComponent,
    DashboardComponent,
    PluginDialogComponent,
    ApplicationArgsDialogComponent,
    RobotCamViewerComponent,
    RobotSpeechComponent,
    GraphyComponent,
    DefsTemplateDirective,
    EdgeTemplateDirective,
    NodeTemplateDirective,
    ActionsManagerComponent,
    WidgetErrorDialogComponent,
    SavedDashboardDialogComponent,
    RestoreSessionDialogComponent,
    ServicesManagerComponent,
    DashboardFullDialogComponent,
    PopoverDirective,
    LlmChatboxComponent,
    FrancolinoComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatIconModule,
    MatSidenavModule,
    MatButtonModule,
    HttpClientModule,
    MatProgressSpinnerModule,
    MatGridListModule,
    MatCardModule,
    MatMenuModule,
    GridsterModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDialogModule,
    MatCheckboxModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatExpansionModule

  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
