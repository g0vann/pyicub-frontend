


import { Component, Input, inject, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, KeyValue } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { GraphNode } from '../../models/graph.model';
import { GraphService } from '../../services/graph.service';
import { debounceTime, Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './properties-panel.html',
  styleUrls: ['properties-panel.scss']
})
export class PropertiesPanel implements OnDestroy, OnChanges {
  @Input() node: GraphNode | undefined;

  private graphService = inject(GraphService);
  private modelChanged = new Subject<{ key: string, value: any, type?: string, isNested?: boolean }>();
  private subscription: Subscription;

  actionMetadata: any;

  constructor() {
    this.subscription = this.modelChanged
      .pipe(debounceTime(400))
      .subscribe(({ key, value, type, isNested }) => {
        if (this.node) {
          let changes: Partial<GraphNode> = {};
          let finalValue = value;

          if (type === 'boolean[]') {
            finalValue = this.convertToArray(value);
          }

          if (isNested) {
            if (!this.node.data) {
              this.node.data = {};
            }
            this.node.data[key] = finalValue;
            changes.data = this.node.data;
          } else {
            changes[key] = finalValue;
          }
          this.graphService.updateNode(this.node.id, changes);
        }
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['node'] && this.node) {
      if (this.node.type === 'action' && this.node.propertiesMetadata) {
        this.actionMetadata = this.node.propertiesMetadata;
      } else {
        this.actionMetadata = null;
      }
    }
  }

  onPropertyChange(key: string, value: any, type?: string, isNested: boolean = false) {
    this.modelChanged.next({ key, value, type, isNested });
  }

  private convertToArray(value: string): boolean[] {
    if (typeof value !== 'string') return [];
    return value.split(',').map(item => item.trim().toLowerCase() === 'true');
  }

  originalOrder = (a: KeyValue<string, any>, b: KeyValue<string, any>): number => {
    return 0;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}

