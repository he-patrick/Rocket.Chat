import { EventEmitter } from 'events';
import {
  IdeaNode,
  Edge,
  RelationType,
  NodeOperations,
  RelationshipOperations,
  GraphOperations,
  VisNode,
  VisEdge,
  GraphUpdateEvent
} from '../types/graph';

export class GraphManager implements NodeOperations, RelationshipOperations, GraphOperations {
  private nodes: Map<string, IdeaNode>;
  private edges: Map<string, Edge>;
  private rootNodes: Set<string>;
  private eventEmitter: EventEmitter;

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.rootNodes = new Set();
    this.eventEmitter = new EventEmitter();
  }

  // Event handling
  public on(event: string, listener: (event: GraphUpdateEvent) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (event: GraphUpdateEvent) => void): void {
    this.eventEmitter.off(event, listener);
  }

  private emitUpdate(event: GraphUpdateEvent): void {
    this.eventEmitter.emit('graphUpdate', event);
  }

  // Node Operations
  public addNode(node: IdeaNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Node with id ${node.id} already exists`);
    }

    this.nodes.set(node.id, node);
    
    if (!node.parentId) {
      this.rootNodes.add(node.id);
    }

    this.emitUpdate({
      type: 'nodeAdded',
      data: node
    });
  }

  public updateNode(nodeId: string, updates: Partial<IdeaNode>): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node with id ${nodeId} not found`);
    }

    Object.assign(node, updates);
    this.nodes.set(nodeId, node);

    this.emitUpdate({
      type: 'nodeUpdated',
      data: node
    });
  }

  public removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node with id ${nodeId} not found`);
    }

    // First, find all edges involving this node
    const edgesToRemove = Array.from(this.edges.entries())
      .filter(([_, edge]) => edge.source === nodeId || edge.target === nodeId);

    // Process each edge
    edgesToRemove.forEach(([edgeId, edge]) => {
      const otherNodeId = edge.source === nodeId ? edge.target : edge.source;
      const otherNode = this.nodes.get(otherNodeId);
      
      if (otherNode) {
        // Remove any relationships in the other node that reference this node
        delete otherNode.relationships[nodeId];
        
        // If this node was the parent, update the child's parentId
        if (edge.type === RelationType.PARENT_CHILD && edge.source === nodeId) {
          delete otherNode.parentId;
          this.rootNodes.add(otherNodeId);
        }
      }
      
      this.edges.delete(edgeId);
    });

    this.nodes.delete(nodeId);
    this.rootNodes.delete(nodeId);

    this.emitUpdate({
      type: 'nodeRemoved',
      data: { nodeId }
    });
  }

  public getNode(nodeId: string): IdeaNode | undefined {
    return this.nodes.get(nodeId);
  }

  public getRootNodes(): IdeaNode[] {
    return Array.from(this.rootNodes).map(id => this.nodes.get(id)!);
  }

  // Relationship Operations
  public addRelationship(sourceId: string, targetId: string, type: RelationType, strength: number): void {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      throw new Error('Source or target node not found');
    }

    const edgeId = `${sourceId}-${targetId}`;
    const edge: Edge = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      type,
      strength,
      metadata: {
        created: new Date(),
        lastUpdated: new Date()
      }
    };

    this.edges.set(edgeId, edge);

    const sourceNode = this.nodes.get(sourceId)!;
    const targetNode = this.nodes.get(targetId)!;

    const relationshipData = {
      type,
      strength,
      created: new Date()
    };

    if (type === RelationType.PARENT_CHILD) {
      // For parent-child, only store in source (parent) node
      sourceNode.relationships[targetId] = relationshipData;
      targetNode.parentId = sourceId;
      this.rootNodes.delete(targetId);
    } else {
      // For other relationships, store bidirectionally
      sourceNode.relationships[targetId] = relationshipData;
      targetNode.relationships[sourceId] = relationshipData;
    }

    this.emitUpdate({
      type: 'relationshipAdded',
      data: edge
    });
  }

  public updateRelationshipStrength(sourceId: string, targetId: string, newStrength: number): void {
    const edgeId = `${sourceId}-${targetId}`;
    const edge = this.edges.get(edgeId);
    if (!edge) {
      throw new Error('Relationship not found');
    }

    edge.strength = newStrength;
    edge.metadata.lastUpdated = new Date();
    this.edges.set(edgeId, edge);

    const sourceNode = this.nodes.get(sourceId)!;
    sourceNode.relationships[targetId].strength = newStrength;

    // Update target node's relationship if it's bidirectional
    if (edge.type !== RelationType.PARENT_CHILD) {
      const targetNode = this.nodes.get(targetId)!;
      targetNode.relationships[sourceId].strength = newStrength;
    }

    this.emitUpdate({
      type: 'relationshipUpdated',
      data: edge
    });
  }

  public removeRelationship(sourceId: string, targetId: string): void {
    const edgeId = `${sourceId}-${targetId}`;
    const edge = this.edges.get(edgeId);
    if (!edge) {
      throw new Error('Relationship not found');
    }

    this.edges.delete(edgeId);

    const sourceNode = this.nodes.get(sourceId)!;
    const targetNode = this.nodes.get(targetId)!;

    delete sourceNode.relationships[targetId];

    if (edge.type === RelationType.PARENT_CHILD) {
      delete targetNode.parentId;
      this.rootNodes.add(targetId);
    } else {
      delete targetNode.relationships[sourceId];
    }

    this.emitUpdate({
      type: 'relationshipRemoved',
      data: { sourceId, targetId }
    });
  }

  public getRelationships(nodeId: string): Array<{ nodeId: string; type: RelationType; strength: number }> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node with id ${nodeId} not found`);
    }

    const relationships = Object.entries(node.relationships).map(([targetId, rel]) => ({
      nodeId: targetId,
      type: rel.type,
      strength: rel.strength
    }));

    // If this node has a parent, add that relationship only if the parent still exists
    if (node.parentId && this.nodes.has(node.parentId)) {
      const parentNode = this.nodes.get(node.parentId)!;
      if (parentNode.relationships[nodeId]) {
        relationships.push({
          nodeId: node.parentId,
          type: RelationType.PARENT_CHILD,
          strength: parentNode.relationships[nodeId].strength
        });
      }
    }

    return relationships;
  }

  // Graph Operations
  public getVisNetworkData(): { nodes: VisNode[]; edges: VisEdge[] } {
    const visNodes: VisNode[] = Array.from(this.nodes.values()).map(node => ({
      id: node.id,
      label: node.label,
      level: node.level,
      color: node.colour,
      size: node.priority * 5 // Scale size based on priority
    }));

    const visEdges: VisEdge[] = Array.from(this.edges.values()).map(edge => ({
      id: edge.id,
      from: edge.source,
      to: edge.target,
      width: edge.strength,
      dashes: edge.type !== RelationType.PARENT_CHILD,
      color: edge.type === RelationType.CONTRADICTS ? '#ff0000' : '#999999'
    }));

    return { nodes: visNodes, edges: visEdges };
  }

  public getSubtree(rootId: string): IdeaNode[] {
    const result: IdeaNode[] = [];
    const visited = new Set<string>();

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      
      const node = this.nodes.get(nodeId);
      if (!node) return;

      visited.add(nodeId);
      result.push(node);

      // Find all child relationships
      this.edges.forEach(edge => {
        if (edge.source === nodeId && edge.type === RelationType.PARENT_CHILD) {
          traverse(edge.target);
        }
      });
    };

    traverse(rootId);
    return result;
  }

  public findPath(startId: string, endId: string): IdeaNode[] {
    const visited = new Set<string>();
    const path: IdeaNode[] = [];
    const parentMap = new Map<string, string>();

    const bfs = (startId: string): boolean => {
      const queue: string[] = [startId];
      visited.add(startId);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (currentId === endId) return true;

        for (const edge of this.edges.values()) {
          if (edge.source === currentId && !visited.has(edge.target)) {
            queue.push(edge.target);
            visited.add(edge.target);
            parentMap.set(edge.target, currentId);
          }
        }
      }

      return false;
    };

    if (bfs(startId)) {
      // Reconstruct path
      let current = endId;
      while (current !== startId) {
        const node = this.nodes.get(current);
        if (!node) break;
        path.unshift(node);
        current = parentMap.get(current)!;
      }
      const startNode = this.nodes.get(startId);
      if (startNode) {
        path.unshift(startNode);
      }
    }

    return path;
  }

  public getRelatedIdeas(nodeId: string, degree: number): IdeaNode[] {
    const result = new Set<IdeaNode>();
    const visited = new Set<string>();
    
    const traverse = (currentId: string, currentDegree: number) => {
      if (currentDegree > degree || visited.has(currentId)) return;
      
      const currentNode = this.nodes.get(currentId);
      if (!currentNode) return;

      visited.add(currentId);
      if (currentId !== nodeId) {
        result.add(currentNode);
      }

      // Find all connected nodes
      this.edges.forEach(edge => {
        if (edge.source === currentId) {
          traverse(edge.target, currentDegree + 1);
        } else if (edge.target === currentId) {
          traverse(edge.source, currentDegree + 1);
        }
      });
    };

    traverse(nodeId, 0);
    return Array.from(result);
  }
}
