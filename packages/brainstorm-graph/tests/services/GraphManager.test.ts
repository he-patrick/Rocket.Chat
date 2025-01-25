import { GraphManager } from '../../src/services/GraphManager';
import { IdeaNode, RelationType } from '../../src/types/graph';

describe('GraphManager', () => {
  let graphManager: GraphManager;

  beforeEach(() => {
    graphManager = new GraphManager();
  });

  describe('Node Operations', () => {
    const testNode: IdeaNode = {
      id: 'node1',
      label: 'Test Node',
      level: 0,
      priority: 1,
      messageIds: ['msg1'],
      metadata: {
        created: new Date(),
        lastUpdated: new Date(),
        confidence: 0.9,
        frequency: 1
      },
      relationships: {}
    };

    it('should add a node successfully', () => {
      graphManager.addNode(testNode);
      const retrievedNode = graphManager.getNode(testNode.id);
      expect(retrievedNode).toEqual(testNode);
    });

    it('should throw error when adding duplicate node', () => {
      graphManager.addNode(testNode);
      expect(() => graphManager.addNode(testNode)).toThrow();
    });

    it('should update node properties', () => {
      graphManager.addNode(testNode);
      const updates = { label: 'Updated Label', priority: 2 };
      graphManager.updateNode(testNode.id, updates);
      const updatedNode = graphManager.getNode(testNode.id);
      expect(updatedNode?.label).toBe('Updated Label');
      expect(updatedNode?.priority).toBe(2);
    });

    it('should remove node and its relationships', () => {
      const node2: IdeaNode = {
        ...testNode,
        id: 'node2',
        label: 'Test Node 2'
      };

      graphManager.addNode(testNode);
      graphManager.addNode(node2);
      graphManager.addRelationship(testNode.id, node2.id, RelationType.PARENT_CHILD, 1);

      graphManager.removeNode(testNode.id);
      expect(graphManager.getNode(testNode.id)).toBeUndefined();
      expect(graphManager.getRelationships(node2.id)).toHaveLength(0);
    });
  });

  describe('Relationship Operations', () => {
    const parentNode: IdeaNode = {
      id: 'parent',
      label: 'Parent Node',
      level: 0,
      priority: 1,
      messageIds: ['msg1'],
      metadata: {
        created: new Date(),
        lastUpdated: new Date(),
        confidence: 0.9,
        frequency: 1
      },
      relationships: {}
    };

    const childNode: IdeaNode = {
      ...parentNode,
      id: 'child',
      label: 'Child Node',
      level: 1
    };

    beforeEach(() => {
      graphManager.addNode(parentNode);
      graphManager.addNode(childNode);
    });

    it('should create parent-child relationship', () => {
      graphManager.addRelationship(parentNode.id, childNode.id, RelationType.PARENT_CHILD, 1);
      const relationships = graphManager.getRelationships(parentNode.id);
      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toEqual({
        nodeId: childNode.id,
        type: RelationType.PARENT_CHILD,
        strength: 1
      });
    });

    it('should update relationship strength', () => {
      graphManager.addRelationship(parentNode.id, childNode.id, RelationType.PARENT_CHILD, 1);
      graphManager.updateRelationshipStrength(parentNode.id, childNode.id, 2);
      const relationships = graphManager.getRelationships(parentNode.id);
      expect(relationships[0].strength).toBe(2);
    });

    it('should remove relationship', () => {
      graphManager.addRelationship(parentNode.id, childNode.id, RelationType.PARENT_CHILD, 1);
      graphManager.removeRelationship(parentNode.id, childNode.id);
      const relationships = graphManager.getRelationships(parentNode.id);
      expect(relationships).toHaveLength(0);
    });
  });

  describe('Graph Operations', () => {
    const setupTestGraph = () => {
      const nodes: IdeaNode[] = [
        {
          id: 'root',
          label: 'Root',
          level: 0,
          priority: 1,
          messageIds: ['msg1'],
          metadata: {
            created: new Date(),
            lastUpdated: new Date(),
            confidence: 0.9,
            frequency: 1
          },
          relationships: {}
        },
        {
          id: 'child1',
          label: 'Child 1',
          level: 1,
          priority: 1,
          messageIds: ['msg2'],
          metadata: {
            created: new Date(),
            lastUpdated: new Date(),
            confidence: 0.8,
            frequency: 1
          },
          relationships: {}
        },
        {
          id: 'child2',
          label: 'Child 2',
          level: 1,
          priority: 1,
          messageIds: ['msg3'],
          metadata: {
            created: new Date(),
            lastUpdated: new Date(),
            confidence: 0.8,
            frequency: 1
          },
          relationships: {}
        }
      ];

      nodes.forEach(node => graphManager.addNode(node));
      graphManager.addRelationship('root', 'child1', RelationType.PARENT_CHILD, 1);
      graphManager.addRelationship('root', 'child2', RelationType.PARENT_CHILD, 1);
      graphManager.addRelationship('child1', 'child2', RelationType.RELATED, 0.5);

      return nodes;
    };

    it('should get correct vis.js network data', () => {
      setupTestGraph();
      const { nodes, edges } = graphManager.getVisNetworkData();
      
      expect(nodes).toHaveLength(3);
      expect(edges).toHaveLength(3);
      
      const rootNode = nodes.find(n => n.id === 'root');
      expect(rootNode?.level).toBe(0);
      
      const relatedEdge = edges.find(e => e.from === 'child1' && e.to === 'child2');
      expect(relatedEdge?.dashes).toBe(true);
    });

    it('should get subtree from root', () => {
      setupTestGraph();
      const subtree = graphManager.getSubtree('root');
      expect(subtree).toHaveLength(3);
    });

    it('should find path between nodes', () => {
      setupTestGraph();
      const path = graphManager.findPath('root', 'child2');
      expect(path.map(n => n.id)).toEqual(['root', 'child2']);
    });

    it('should get related ideas within degree', () => {
      setupTestGraph();
      const related = graphManager.getRelatedIdeas('root', 1);
      expect(related).toHaveLength(2);
    });
  });
});
