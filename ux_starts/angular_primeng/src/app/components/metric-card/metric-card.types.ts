/**
 * Metric card component types
 */

export type MetricVariant = 'info' | 'success' | 'warning' | 'danger' | 'primary' | 'purple';

export interface MetricConfig {
  icon: string;
  value: number | string;
  label: string;
  variant?: MetricVariant;
}
