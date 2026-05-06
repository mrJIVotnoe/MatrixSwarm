export interface CellNode {
  id: string;
  cellId: string;
  trustScore: number;
  powerSource: 'battery' | 'ac';
  role: 'client' | 'relay' | 'magistrate' | 'sandboxed';
}

export class CellOrchestrator {
  private cells: Map<string, CellNode[]> = new Map();

  public registerNode(node: CellNode) {
    if (!this.cells.has(node.cellId)) {
      this.cells.set(node.cellId, []);
    }
    const cellNodes = this.cells.get(node.cellId)!;
    // Remove existing if present to avoid duplicates
    const idx = cellNodes.findIndex(n => n.id === node.id);
    if (idx >= 0) cellNodes.splice(idx, 1);
    
    cellNodes.push(node);
    this.electMagistrate(node.cellId);
  }

  private electMagistrate(cellId: string) {
    const nodes = this.cells.get(cellId);
    if (!nodes || nodes.length === 0) return;

    // Reset current magistrates in this cell (demote to client)
    nodes.forEach(n => {
      if (n.role === 'magistrate') n.role = 'client'; 
    });

    // Magistrates must not be sandboxed
    let bestCandidate: CellNode | null = null;
    let maxTrust = -1;

    // 1. Prefer AC power and highest trust
    for (const node of nodes) {
      if (node.powerSource === 'ac' && node.role !== 'sandboxed') {
        if (node.trustScore > maxTrust) {
          maxTrust = node.trustScore;
          bestCandidate = node;
        }
      }
    }

    // 2. Fallback to any power source if no AC node is available
    if (!bestCandidate) {
      for (const node of nodes) {
        if (node.role !== 'sandboxed' && node.trustScore > maxTrust) {
          maxTrust = node.trustScore;
          bestCandidate = node;
        }
      }
    }

    if (bestCandidate) {
      bestCandidate.role = 'magistrate';
      console.log(`[CellOrchestrator] Node ${bestCandidate.id} elected as Cell_Magistrate for cell ${cellId} (Trust: ${bestCandidate.trustScore})`);
    } else {
      console.log(`[CellOrchestrator] No suitable candidate for Cell_Magistrate in cell ${cellId}`);
    }
  }

  public getCellNodes(cellId: string) {
    return this.cells.get(cellId) || [];
  }
}
