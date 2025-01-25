import { INode } from '../models/Node';

export enum RelationType {
  PARENT_CHILD = 'parent_child',
  RELATED = 'related',
  SUPPORTS = 'supports',
  CONTRADICTS = 'contradicts'
}

export interface IdeaNode extends INode {
  id: string;
  label: string;
  level: number;
  priority: number;
  parentId?: string;
  colour?: string;
  messageIds: string[];
  metadata: {
    created: Date;
    lastUpdated: Date;
    confidence: number;
    frequency: number;
  };
  relationships: {
    [nodeId: string]: {
      type: RelationType;
      strength: number;
      created: Date;
    };
  };
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  strength: number;
  metadata: {
    created: Date;
    lastUpdated: Date;
  };
}

export interface VisNode {
  id: string;
  label: string;
  level: number;
  color?: string;
  size?: number;
}

export interface VisEdge {
  id: string;
  from: string;
  to: string;
  color?: string;
  width?: number;
  dashes?: boolean;
}

export interface GraphUpdateEvent {
  type: 'nodeAdded' | 'nodeUpdated' | 'nodeRemoved' | 'relationshipAdded' | 'relationshipUpdated' | 'relationshipRemoved';
  data: any;
}

export interface NodeOperations {
  addNode(node: IdeaNode): void;
  updateNode(nodeId: string, updates: Partial<IdeaNode>): void;
  removeNode(nodeId: string): void;
  getNode(nodeId: string): IdeaNode | undefined;
  getRootNodes(): IdeaNode[];
}

export interface RelationshipOperations {
  addRelationship(sourceId: string, targetId: string, type: RelationType, strength: number): void;
  updateRelationshipStrength(sourceId: string, targetId: string, newStrength: number): void;
  removeRelationship(sourceId: string, targetId: string): void;
  getRelationships(nodeId: string): Array<{ nodeId: string; type: RelationType; strength: number }>;
}

export interface GraphOperations {
  getVisNetworkData(): {
    nodes: VisNode[];
    edges: VisEdge[];
  };
  getSubtree(rootId: string): IdeaNode[];
  findPath(startId: string, endId: string): IdeaNode[];
  getRelatedIdeas(nodeId: string, degree: number): IdeaNode[];
}
