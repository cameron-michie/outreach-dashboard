'use client';

import React from 'react';
import { useFeatureFlags, type FeatureFlags } from '@/lib/feature-flags';
import { Button } from './button';

interface FeatureFlagToggleProps {
  flag: keyof FeatureFlags;
  label: string;
  description?: string;
  className?: string;
}

export function FeatureFlagToggle({ flag, label, description, className }: FeatureFlagToggleProps) {
  const { flags, setFlag } = useFeatureFlags();
  const isEnabled = flags[flag];

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg ${className || ''}`}>
      <div className="flex-1">
        <div className="font-medium text-gray-900">{label}</div>
        {description && (
          <div className="text-sm text-gray-500 mt-1">{description}</div>
        )}
      </div>
      <Button
        variant={isEnabled ? "default" : "outline"}
        size="sm"
        onClick={() => setFlag(flag, !isEnabled)}
      >
        {isEnabled ? 'Enabled' : 'Disabled'}
      </Button>
    </div>
  );
}

export function FeatureFlagPanel() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Feature Flags</h3>
      <div className="space-y-3">
        <FeatureFlagToggle
          flag="useTnksDataTable"
          label="TNKS Data Table"
          description="Use TanStack-based data table with advanced sorting, filtering, and selection features"
        />
        <FeatureFlagToggle
          flag="enableAdvancedFiltering"
          label="Advanced Filtering"
          description="Enable column-specific filters and advanced search capabilities"
        />
        <FeatureFlagToggle
          flag="enableBulkActions"
          label="Bulk Actions"
          description="Enable bulk operations on selected rows"
        />
      </div>
    </div>
  );
}