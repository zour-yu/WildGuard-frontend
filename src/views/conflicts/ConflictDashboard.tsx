import React from 'react';
import { ManagerTelemetryView } from '../dashboard/ManagerTelemetryView';

/**
 * ConflictDashboard consolidated into Telemetry & Breaches (ManagerTelemetryView).
 * Retained as a re-export wrapper for seamless backward compatibility.
 */
export default function ConflictDashboard({
  onNavigate,
}: {
  onNavigate?: (view: any) => void;
}) {
  return (
    <ManagerTelemetryView
      onNavigateToDispatchLog={() => onNavigate?.('dispatch')}
      onOpenRangerTerminal={() => onNavigate?.('terminal')}
    />
  );
}
