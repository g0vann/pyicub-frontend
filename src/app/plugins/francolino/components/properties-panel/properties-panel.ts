


import { Component, Input, inject, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
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
    MatCheckboxModule,
    MatButtonModule
  ],
  templateUrl: './properties-panel.html',
  styleUrls: ['properties-panel.scss']
})
export class PropertiesPanel implements OnDestroy, OnChanges {
  @Input() node: GraphNode | undefined;

  private graphService = inject(GraphService);
  private modelChanged = new Subject<void>();
  private subscription: Subscription;

  formState: { name: string; description: string; offset_ms: number | null; wait_for_steps: boolean[] } = {
    name: '',
    description: '',
    offset_ms: null,
    wait_for_steps: []
  };
  stepsCount = 0;

  constructor() {
    this.subscription = this.modelChanged
      .pipe(debounceTime(400))
      .subscribe(() => {
        /* placeholder for future validations */
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['node']) this.rebuildForm();
  }

  onFieldChange<K extends keyof typeof this.formState>(key: K, value: any) {
    if (key === 'offset_ms') {
      const num = value === null || value === '' ? null : Number(value);
      this.formState.offset_ms = Number.isFinite(num) ? num : null;
    } else if (key === 'name' || key === 'description') {
      (this.formState as any)[key] = value ?? '';
    }
    this.modelChanged.next();
  }

  onWaitForStepToggle(index: number, checked: boolean) {
    const updated = [...this.formState.wait_for_steps];
    updated[index] = checked;
    this.formState.wait_for_steps = updated;
    this.modelChanged.next();
  }

  save() {
    if (!this.node) return;
    const newName = (this.formState.name || '').trim();
    if (!newName) {
      alert('Il nome dell\'azione è obbligatorio.');
      return;
    }
    const duplicate = this.graphService.getCurrentGraphData().nodes
      .some(n => n.id !== this.node!.id && (n.label === newName || (n.data && n.data.name === newName)));
    if (duplicate) {
      alert('Esiste già un\'azione con lo stesso nome. Scegli un nome diverso.');
      return;
    }

    const updatedData = {
      ...(this.node.data || {}),
      name: newName,
      description: this.formState.description || '',
      offset_ms: this.formState.offset_ms,
      wait_for_steps: [...this.formState.wait_for_steps]
    };

    this.graphService.updateNode(this.node.id, {
      label: newName,
      data: updatedData
    });
  }

  private rebuildForm() {
    if (!this.node || this.node.type !== 'action') {
      this.formState = { name: '', description: '', offset_ms: null, wait_for_steps: [] };
      this.stepsCount = 0;
      return;
    }
    const data = this.node.data || {};
    const steps = Array.isArray(data.steps) ? data.steps : [];
    this.stepsCount = steps.length;
    const waitValues = Array.isArray(data.wait_for_steps) ? data.wait_for_steps : [];

    this.formState = {
      name: data.name || this.node.label || '',
      description: data.description || '',
      offset_ms: typeof data.offset_ms === 'number' ? data.offset_ms : null,
      wait_for_steps: Array.from({ length: this.stepsCount }, (_, i) => Boolean(waitValues[i]))
    };
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}

