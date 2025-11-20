


import { Component, Input, inject, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';

import { CommonModule, KeyValue } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { MatExpansionModule } from '@angular/material/expansion';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatInputModule } from '@angular/material/input';

import { MatSelectModule } from '@angular/material/select';

import { GraphNode } from '../../models/graph.model';

import { GraphService } from '../../services/graph.service';

import { debounceTime, Subject, Subscription, lastValueFrom } from 'rxjs';

import { HttpClient } from '@angular/common/http';



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

  private http = inject(HttpClient);

  private modelChanged = new Subject<{ key: string, value: any, type?: string, isNested?: boolean }>();

  private subscription: Subscription;



  metadata: any;

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

            // For properties inside node.data

            if (!this.node.data) {

              this.node.data = {}; // Initialize if null

            }

            this.node.data[key] = finalValue;

            changes.data = this.node.data; // Pass the entire (updated) data object

          } else {

            // For top-level properties like label and color

            changes[key] = finalValue;

          }

          this.graphService.updateNode(this.node.id, changes);

        }

      });

    this.loadMetadata();

  }



  async loadMetadata() {

    this.metadata = await lastValueFrom(this.http.get<any>('assets/actions-metadata.json'));

  }



  ngOnChanges(changes: SimpleChanges) {

    if (changes['node'] && this.node) {

      if (this.node.type === 'action' && this.metadata) {

        this.actionMetadata = this.metadata[this.node.label];

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



  // Preserve original property order

  originalOrder = (a: KeyValue<string, any>, b: KeyValue<string, any>): number => {

    return 0;

  }



  ngOnDestroy() {

    this.subscription.unsubscribe();

  }

}
