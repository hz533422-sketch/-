export enum Language {
  EN = 'EN',
  ZH = 'ZH'
}

export type Page = 'dashboard' | 'scan' | 'upload' | 'analysis' | 'report' | 'settings';

export interface ScanPoint {
  x: number;
  y: number;
  z: number; // Deviation from 0
  intensity: number;
}

export interface AnalysisMetrics {
  averageDeviation: number;
  maxDeviation: number;
  minDeviation: number;
  flatnessScore: number; // 0-100
  timestamp: string;
}

export interface DesignFile {
  name: string;
  size: string;
  type: 'dwg' | 'ifc' | 'rvt';
  uploadDate: string;
}

export interface ReportData {
  metrics: AnalysisMetrics;
  aiAnalysis: string;
  recommendations: string[];
}
