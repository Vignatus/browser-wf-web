export function omit<T extends Record<string, unknown>, K extends keyof T>(
  value: T,
  keys: readonly K[],
): Omit<T, K> {
  const result = { ...value };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

export function getStepCount(recordingJson: Record<string, unknown>, fallbackSteps?: unknown[]) {
  if (Array.isArray(recordingJson.steps)) {
    return recordingJson.steps.length;
  }

  return fallbackSteps?.length ?? 0;
}
