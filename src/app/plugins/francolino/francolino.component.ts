import { Component } from '@angular/core';
import { WidgetBaseComponent } from '../../widget-base/widget-base.component';

// Angular Core
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material (devono essere importati anche qui)
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

// Il componente root della tua app interna
import { Shell } from './components/shell/shell';

@Component({
  selector: 'app-francolino',
  templateUrl: './francolino.component.html',
  styleUrls: ['./francolino.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    // Material
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatButtonModule,
    MatTooltipModule,
    // La tua app
    Shell
  ],
  host: {
    style: 'display:block; width:100%; height:100%;'
  }
})
export class FrancolinoComponent extends WidgetBaseComponent {}
