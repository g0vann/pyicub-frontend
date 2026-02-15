import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {Plugin} from "../types/Plugin";
import {Application} from "../types/Application";


@Component({
  selector: 'app-plugin-dialog',
  templateUrl: './plugin-dialog.component.html',
  styleUrl: './plugin-dialog.component.css'
})
export class PluginDialogComponent {

  onCheckboxChange(plugin:Plugin){
    const isFrancolino = plugin.name === 'Francolino';
    const isEnabling = !plugin.enabled;

    if (isFrancolino && isEnabling) {
      const totalCols = 100;
      const totalRows = 100;
      const totalDashboardArea = totalCols * totalRows;
      const occupiedPlugins = this.data.plugins
        .filter(p => p.enabled && p.name !== 'Francolino')
      const occupiedArea = occupiedPlugins.reduce((sum, p) => sum + (p.cols * p.rows), 0);
      const occupiedPercentage = (occupiedArea / totalDashboardArea) * 100;

      if (occupiedPercentage >= 75) {
        window.alert('Impossibile attivare FSM Editor (Francolino): lo spazio occupato in dashboard e troppo alto (>= 75%). Libera spazio e riprova.');
        return;
      }

      if (occupiedPlugins.length === 0) {
        // No other widgets: full dashboard.
        plugin.x = 0;
        plugin.y = 0;
        plugin.cols = totalCols;
        plugin.rows = totalRows;
      } else {
        // Other widgets exist: occupy the largest continuous free rectangle.
        const largestFreeRect = this.findLargestFreeRectangle(occupiedPlugins, totalCols, totalRows);
        if (!largestFreeRect || largestFreeRect.cols <= 0 || largestFreeRect.rows <= 0) {
          window.alert('Impossibile attivare FSM Editor (Francolino): non esiste uno spazio libero continuo sufficiente.');
          return;
        }
        plugin.x = largestFreeRect.x;
        plugin.y = largestFreeRect.y;
        plugin.cols = largestFreeRect.cols;
        plugin.rows = largestFreeRect.rows;
      }
    }

    this.data.togglePlugin(plugin)
  }

  private findLargestFreeRectangle(
    occupied: Plugin[],
    totalCols: number,
    totalRows: number
  ): { x: number; y: number; cols: number; rows: number } | null {
    const grid = this.buildOccupiedGrid(occupied, totalCols, totalRows);
    const heights = new Array<number>(totalCols).fill(0);
    let best: { x: number; y: number; cols: number; rows: number; area: number } | null = null;

    for (let row = 0; row < totalRows; row++) {
      for (let col = 0; col < totalCols; col++) {
        heights[col] = grid[row][col] ? 0 : heights[col] + 1;
      }

      const stack: number[] = [];
      for (let i = 0; i <= totalCols; i++) {
        const currentHeight = i === totalCols ? 0 : heights[i];

        while (stack.length > 0 && heights[stack[stack.length - 1]] > currentHeight) {
          const top = stack.pop() as number;
          const h = heights[top];
          const leftBoundary = stack.length > 0 ? stack[stack.length - 1] + 1 : 0;
          const rightBoundary = i - 1;
          const width = rightBoundary - leftBoundary + 1;
          const area = h * width;

          if (area > 0 && (!best || area > best.area)) {
            best = {
              x: leftBoundary,
              y: row - h + 1,
              cols: width,
              rows: h,
              area
            };
          }
        }

        stack.push(i);
      }
    }

    if (!best) return null;
    return { x: best.x, y: best.y, cols: best.cols, rows: best.rows };
  }

  private buildOccupiedGrid(
    occupied: Plugin[],
    totalCols: number,
    totalRows: number
  ): boolean[][] {
    const grid: boolean[][] = Array.from({ length: totalRows }, () => Array<boolean>(totalCols).fill(false));

    occupied.forEach(p => {
      const startX = Math.max(0, p.x);
      const startY = Math.max(0, p.y);
      const endX = Math.min(totalCols, p.x + p.cols);
      const endY = Math.min(totalRows, p.y + p.rows);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          grid[y][x] = true;
        }
      }
    });

    return grid;
  }

  constructor(@Inject(MAT_DIALOG_DATA) public data: Application) {}

}
