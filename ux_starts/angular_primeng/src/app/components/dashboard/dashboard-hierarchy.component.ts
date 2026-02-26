import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnInit,
  OnDestroy,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DashboardHierarchyData, DashboardItem } from './dashboard.types';
import { catchError, of } from 'rxjs';

// Properly declare ApexTree as a global library
declare const ApexTree: any;

@Component({
  selector: 'pb-dashboard-hierarchy',
  standalone: true,
  imports: [CommonModule, CardModule, ProgressSpinnerModule],
  template: `
    <p-card [title]="title" styleClass="h-full w-full">
      <h2>{{ title }}</h2>
      <h3 *ngIf="subTitle">{{ subTitle }}</h3>
      <div [class.loading-container]="loading" class="chart-container">
        <!-- Container for ApexTree -->
        <div #treeContainer class="hierarchy-chart"></div>

        <div *ngIf="loading" class="chart-loading-overlay">
          <p-progressSpinner></p-progressSpinner>
        </div>
      </div>
    </p-card>
  `,
  styles: [
    `
      .h-full {
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .chart-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 100%;
        overflow: hidden;
        position: relative;
      }

      .loading-container {
        position: relative;
        min-height: 200px;
      }

      .chart-loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: rgba(255, 255, 255, 0.5);
        border-radius: 8px;
        z-index: 1;
      }

      .hierarchy-chart {
        width: 100%;
        height: 100%;
        max-width: none !important; /* Remove width limitation */
        overflow: visible;
      }

      /* ApexTree specific styles */
      .apex-tree-node {
        padding: 0.5rem;
      }

      .apex-tree-connector {
        stroke: var(--primary-color, #2196f3);
        stroke-width: 1.5px;
      }

      .apex-tree-container {
        width: 100% !important; /* Force full width */
        height: 100%;
        overflow: visible;
        max-width: none !important; /* Remove any width restrictions */
      }

      .node-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.5rem;
        min-width: 5rem;
        max-width: 10rem;
        position: relative;
        border-radius: 6px;
        background-color: #fff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .node-label {
        font-weight: bold;
        margin-bottom: 0.25rem;
      }

      .node-subtitle {
        font-size: 0.85rem;
        color: var(--text-color-secondary);
      }

      /* Root and owner node styles */
      .root-node {
        background-color: rgba(33, 150, 243, 0.1);
        border: 1px solid var(--primary-color, #2196f3);
      }

      .owner-node {
        background-color: rgba(76, 175, 80, 0.1);
        border: 1px solid var(--green-500, #4caf50);
      }

      .node-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: bold;
        color: white;
      }

      .root-badge {
        background-color: #2196f3;
      }

      .owner-badge {
        background-color: #4caf50;
      }
    `,
  ],
})
export class DashboardHierarchyComponent
  implements AfterViewInit, OnInit, OnDestroy
{
  @Input() hierarchyData!: DashboardHierarchyData;
  @Input() itemConfig!: DashboardItem;
  @Input() loading: boolean = false;
  @ViewChild('treeContainer') treeContainer!: ElementRef;
  data: any[] = [];
  currentData: any[] = [];
  treeInstance: any = null;
  private resizeListener: any;
  title: string = this.hierarchyData?.title || 'Loading...';
  subTitle: string | null = this.hierarchyData?.subTitle || null;

  // ApexTree options
  treeOptions = {
    orientation: 'vertical',
    nodeSpacing: 40,
    levelSpacing: 60,
    selectable: true,
    animated: true,
    animationDuration: 300,
    allowPan: true,
    allowZoom: true,
    minZoom: 0.5,
    maxZoom: 2,
    centerOnResize: true,
    renderNode: this.renderCustomNode.bind(this),
    fitOnInit: true,
    width: '100%', // Ensure this is set to 100%
    height: '100%', // Ensure this is set to 100%
    autoSize: true, // Add autoSize option to make sure it fills the container
  };

  onNodeSelect(node: any): void {
    if (this.hierarchyData.onNodeSelect) {
      // Toggle node expansion
      node.expanded = !node.expanded;
      // Create a focused view with selected node in the middle
      this.createFocusedHierarchy(node);
      // Call the provided callback function
      this.hierarchyData.onNodeSelect({ node });
    }
  }

  /**
   * Custom node renderer for ApexTree
   */
  renderCustomNode(node: any, element: HTMLElement): void {
    // Create node content
    element.innerHTML = '';
    const nodeContent = document.createElement('div');
    nodeContent.className = 'node-content';
    if (node.data?.isRootNode) {
      nodeContent.classList.add('root-node');
      const rootBadge = document.createElement('div');
      rootBadge.className = 'node-badge root-badge';
      rootBadge.textContent = 'Root';
      nodeContent.appendChild(rootBadge);
    }
    if (node.data?.isOwner) {
      nodeContent.classList.add('owner-node');
      const ownerBadge = document.createElement('div');
      ownerBadge.className = 'node-badge owner-badge';
      ownerBadge.textContent = 'Owner';
      nodeContent.appendChild(ownerBadge);
    }
    const nodeLabel = document.createElement('div');
    nodeLabel.className = 'node-label';
    nodeLabel.textContent = node.label || '';
    nodeContent.appendChild(nodeLabel);
    if (node.data?.title) {
      const nodeSubtitle = document.createElement('div');
      nodeSubtitle.className = 'node-subtitle';
      nodeSubtitle.textContent = node.data.title;
      nodeContent.appendChild(nodeSubtitle);
    }
    element.appendChild(nodeContent);
  }

  /**
   * Creates a focused hierarchy with the selected node in the middle,
   * one parent above, and all children below
   */
  private createFocusedHierarchy(selectedNode: any): void {
    // Store original hierarchy if not already stored
    if (!this.data || this.data.length === 0) {
      this.data = this.deepClone(this.currentData);
    }
    // Find the parent of the selected node in the original hierarchy
    const parentNode = this.findParentNode(this.data, selectedNode);
    // Create a new focused hierarchy
    if (parentNode) {
      // Create a simplified parent with only the selected child
      const simplifiedParent = {
        ...parentNode,
        children: [selectedNode],
      };
      // Create the focused view with parent above and selected node in the middle
      this.currentData = [simplifiedParent];
    } else {
      // If no parent found (root node selected), just use the selected node
      this.currentData = [selectedNode];
    }
    // Update the tree with the new data
    this.updateTree();
  }

  /**
   * Update the tree with the current data
   */
  private updateTree(): void {
    if (this.treeInstance) {
      this.treeInstance.render(this.data[0]);
      setTimeout(() => this.adjustTreeView(), 100);
    }
  }

  /**
   * Recursively find the parent node of a given child node
   */
  private findParentNode(nodes: any[], childNode: any): any | null {
    if (!nodes || nodes.length === 0) return null;
    for (const node of nodes) {
      // Check if any of this node's children is the target
      // if (
      //   node.children &&
      //   node.children.some(
      //     (child) => child.id === childNode.id || child.key === childNode.key
      //   )
      // ) {
      return node;
      //}
      // Recursively search in children
      if (node.children && node.children.length > 0) {
        const parent = this.findParentNode(node.children, childNode);
        if (parent) return parent;
      }
    }
    return null;
  }

  /**
   * Create a deep clone of the data to avoid reference issues
   */
  private deepClone(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Convert API data to ApexTree format
   */
  private convertToApexTreeFormat(apiData: any[]): any[] {
    if (!apiData || apiData.length === 0) {
      return [];
    }
    // Recursive function to convert nodes
    const convertNode = (node: any): any => {
      return {
        id:
          node.id ||
          node.key ||
          `node-${Math.random().toString(36).substr(2, 9)}`,
        label: node.name || node.label || 'Unnamed Node',
        name: node.name || node.label || 'Unnamed Node',
        expanded: true, // Start with nodes expanded
        options: {
          nodeBGColor: node.color,
        },

        children: node.children
          ? node.children.map((child: any) => convertNode(child))
          : [],
        data: {
          ...node.data,
          isRootNode: node.data?.isRootNode || false,
          isOwner: node.data?.isOwner || false,
          title: node.data?.title || node.title,
        },
      };
    };
    return apiData.map((node) => convertNode(node));
  }

  loadData(): void {
    if (this.itemConfig.loadItems) {
      this.loading = true;
      this.itemConfig
        .loadItems()
        .pipe(
          catchError((error) => {
            console.error('Error loading items:', error);
            this.loading = false;
            return of([]);
          })
        )
        .subscribe((apiData) => {
          // Convert data to ApexTree format
          const treeData = this.convertToApexTreeFormat(apiData);
          this.data = treeData;
          this.currentData = treeData;
          this.loading = false;
          // Initialize or update the tree with the new data
          this.initializeTree();
          this.title = this.hierarchyData?.title || '';
          this.subTitle = this.hierarchyData?.subTitle || null;
        });
    }
  }

  /**
   * Initialize the ApexTree instance
   */
  private initializeTree(): void {
    if (!this.treeContainer || !this.treeContainer.nativeElement) {
      console.error('Tree container not found');
      return;
    }

    try {
      if (this.treeInstance) {
        this.updateTree();
      } else {
        // Create new ApexTree instance with error handling
        if (typeof ApexTree === 'undefined') {
          console.error(
            'ApexTree is not defined. Make sure the library is properly loaded.'
          );
          this.loading = false;
          return;
        }

        // Set explicit width to container element to ensure full width
        this.treeContainer.nativeElement.style.width = '100%';
        this.treeContainer.nativeElement.style.maxWidth = 'none';

        // Initialize with empty data if none provided
        const initialData =
          this.currentData && this.currentData.length > 0
            ? this.currentData
            : [];

        // Create the ApexTree instance - ApexTree constructor requires (element, data, options)
        this.treeInstance = new ApexTree(
          this.treeContainer.nativeElement,
          initialData,
          this.treeOptions
        );

        // Force resize after initialization
        setTimeout(() => this.adjustTreeView(), 200);
      }
    } catch (error) {
      console.error('Error initializing ApexTree:', error);
      this.loading = false;
    }
  }

  ngOnInit(): void {
    // Load data when the component initializes
    if (this.itemConfig && this.itemConfig.loadItems) {
      this.loadData();
    } else if (this.hierarchyData && this.hierarchyData.data) {
      // If data is provided directly through input
      this.data = this.convertToApexTreeFormat(this.hierarchyData.data);
      this.currentData = this.data;
    }
  }

  ngAfterViewInit(): void {
    // Initialize the tree after the view is ready
    setTimeout(() => {
      this.initializeTree();
    }, 100);
    // Handle window resize events
    this.resizeListener = () => this.adjustTreeView();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    // Clean up the resize event listener
    window.removeEventListener('resize', this.resizeListener);
    // Destroy the ApexTree instance
    // if (this.treeInstance) {
    //   this.treeInstance.destroy();
    // }
  }

  /**
   * Adjust the tree view to fit the container
   */
  private adjustTreeView(): void {
    if (this.treeInstance) {
      // Force resize of the tree container
      if (this.treeContainer && this.treeContainer.nativeElement) {
        // Force full width
        this.treeContainer.nativeElement.style.width = '100%';
        this.treeContainer.nativeElement.style.maxWidth = 'none';

        const ne = this.treeContainer.nativeElement;
        ne.childNodes[0].style.width = '100%';
        ne.childNodes[0].childNodes[0].style.width = '100%';

        // If tree has a resize method, call it
        if (typeof this.treeInstance.resize === 'function') {
          this.treeInstance.resize();
        }

        // If tree has a fit method, call it
        if (typeof this.treeInstance.fit === 'function') {
          this.treeInstance.fit();
        }
      }
    }
  }
}
