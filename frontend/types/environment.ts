/**
 * Environment configuration types matching backend models.
 */

export interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
}
