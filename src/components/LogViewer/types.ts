import { LogEntry, LogLevel, LogSource } from '../../types';

export interface LogViewerProps {
  logs: LogEntry[];
  onExport: () => void;
  onClear: () => void;
}

export interface LogFilter {
  levels: Set<LogLevel>;
  sources: Set<LogSource>;
  serverIds: Set<string>;
  searchTerm: string;
  startTime?: number;
  endTime?: number;
}

export interface LogViewerState {
  filter: LogFilter;
  expandedLogs: Set<string>;
  selectedLogs: Set<string>;
}

export interface LogEntryProps {
  log: LogEntry;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string) => void;
} 