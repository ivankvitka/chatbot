// Alert metadata structure
export interface AlertMetadata {
  locationLocalized?: {
    en: string;
    ua: string;
  };
  targetId?: string;
  geometry: [number, number]; // [longitude, latitude]
}

// Alert message arguments
export interface AlertMessageArgs {
  codes: {
    name: string;
  };
}

// Full Alert structure
export interface Alert {
  id: string;
  createdAt: string;
  alertType: string;
  alertMessageArgs: AlertMessageArgs;
  alertZoneIds: string[];
  metadata: AlertMetadata;
}

// Alert configuration for a specific alert type
export interface AlertTypeConfig {
  enabled: boolean;
  popupNotification: boolean;
  color: string;
  duration: number;
  soundNotification: boolean;
  soundNotificationType: string;
}

// Global alert configuration
export interface GlobalAlertConfig {
  newTarget: AlertTypeConfig;
  targetDeleted: AlertTypeConfig;
  targetFinished: AlertTypeConfig;
  eRocketBindingDeleted: AlertTypeConfig;
  newFpvPlan: AlertTypeConfig;
  fpvPlanDeleted: AlertTypeConfig;
}

// Zone-specific alert configuration
export interface ZoneAlertConfig {
  targetEnteredAlertZone: AlertTypeConfig;
  targetLeftAlertZone: AlertTypeConfig;
  loiteringMunitionEnteredAlertZone: AlertTypeConfig;
  loiteringMunitionLeftAlertZone: AlertTypeConfig;
  radarTargetEnteredAlertZone: AlertTypeConfig;
  radarTargetLeftAlertZone: AlertTypeConfig;
  newFpvPlan: AlertTypeConfig;
  fpvPlanDeleted: AlertTypeConfig;
}

// User alert configuration structure
export interface UserAlertConfig {
  global: GlobalAlertConfig;
  alertZones: Record<string, ZoneAlertConfig>;
}

// Full structure of the "alerts" JSON string
export interface AlertsData {
  alerts: Alert[];
  eventLog: Alert[];
  userAlertConfig: UserAlertConfig;
  globalSettingsExpansion: boolean;
  zoneSettingsExpansion: boolean;
}

// Simplified interface for backward compatibility (only alerts array)
export interface Alerts {
  alerts: Alert[];
}

// Local user settings structure
export interface LocalUserSettings {
  eRocketTargetsEnabled: boolean;
  sensitiveInformationMode: boolean;
  alertAreasMode: boolean;
  radarsTargetsEnabled: boolean;
}

// Main DambaSettings structure (localStorage content)
export interface DambaSettings {
  alerts: string; // JSON string of AlertsData
  localUserSettings?: string; // JSON string of LocalUserSettings
  [key: string]: string | undefined; // Other localStorage keys (mapbox events, coordinates, etc.)
}
