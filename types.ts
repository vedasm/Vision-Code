export interface GraphNode {
  id: string;
  label: string;
  type?: 'value' | 'pointer' | 'root' | 'null';
  color?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface VisualizationFrame {
  step: number;
  lineCode: string;
  explanation: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AnalysisResult {
  frames: VisualizationFrame[];
  timeComplexity: string;
  spaceComplexity: string;
  conceptExplanation: string;
  detectedStructure: string;
}

export enum EditorMode {
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  JAVA = 'java',
}
