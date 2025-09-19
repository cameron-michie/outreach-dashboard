'use client';

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./Input";
import { Loading } from "./Loading";

// Base table interfaces
export interface Column<T = any> {
  id: string;
  header: string;
  accessor?: keyof T | ((item: T) => any);
  cell?: (value: any, item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: "left" | "center" | "right";
}

export interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: string;
  className?: string;

  // Sorting
  sortable?: boolean;
  defaultSort?: SortConfig;
  onSort?: (config: SortConfig) => void;

  // Filtering
  filterable?: boolean;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;

  // Pagination
  pagination?: PaginationConfig;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  // Selection
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  getRowId?: (item: T) => string;

  // Actions
  actions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: (item: T) => void;
    variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
    disabled?: (item: T) => boolean;
  }[];

  // Empty state
  emptyState?: React.ReactNode;

  // Row styling
  getRowClassName?: (item: T, index: number) => string;
  rowClickable?: boolean;
  onRowClick?: (item: T) => void;
}

const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  error,
  className,
  sortable = true,
  defaultSort,
  onSort,
  filterable = true,
  globalFilter = "",
  onGlobalFilterChange,
  pagination,
  onPageChange,
  onPageSizeChange,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  getRowId = (item, index) => item.id || index.toString(),
  actions = [],
  emptyState,
  getRowClassName,
  rowClickable = false,
  onRowClick,
}: DataTableProps<T>) => {
  const [sortConfig, setSortConfig] = React.useState<SortConfig | null>(defaultSort || null);
  const [filter, setFilter] = React.useState(globalFilter);

  // Handle sorting
  const handleSort = (columnId: string) => {
    if (!sortable) return;

    const newConfig: SortConfig = {
      key: columnId,
      direction: sortConfig?.key === columnId && sortConfig.direction === "asc" ? "desc" : "asc",
    };

    setSortConfig(newConfig);
    onSort?.(newConfig);
  };

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (!selectable || !onSelectionChange) return;

    if (checked) {
      const allIds = data.map((item, index) => getRowId(item, index));
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };

  const handleRowSelect = (rowId: string, checked: boolean) => {
    if (!selectable || !onSelectionChange) return;

    if (checked) {
      onSelectionChange([...selectedRows, rowId]);
    } else {
      onSelectionChange(selectedRows.filter(id => id !== rowId));
    }
  };

  const isAllSelected = selectable && data.length > 0 && selectedRows.length === data.length;
  const isIndeterminate = selectable && selectedRows.length > 0 && selectedRows.length < data.length;

  // Render cell content
  const renderCell = (column: Column<T>, item: T, index: number) => {
    if (column.cell) {
      const value = column.accessor
        ? typeof column.accessor === "function"
          ? column.accessor(item)
          : item[column.accessor]
        : item;
      return column.cell(value, item, index);
    }

    if (column.accessor) {
      return typeof column.accessor === "function"
        ? column.accessor(item)
        : item[column.accessor];
    }

    return null;
  };

  const getSortIcon = (columnId: string) => {
    if (!sortConfig || sortConfig.key !== columnId) {
      return (
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    if (sortConfig.direction === "asc") {
      return (
        <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      );
    }

    return (
      <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="w-full">
        {filterable && (
          <div className="mb-4">
            <Input
              placeholder="Search..."
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                onGlobalFilterChange?.(e.target.value);
              }}
              leftIcon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
        )}
        <div className="border rounded-lg">
          <div className="p-8">
            <Loading size="lg" text="Loading data..." />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        {filterable && (
          <div className="mb-4">
            <Input
              placeholder="Search..."
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                onGlobalFilterChange?.(e.target.value);
              }}
              disabled
            />
          </div>
        )}
        <div className="border rounded-lg">
          <div className="p-8 text-center">
            <div className="text-red-600 mb-2">Error loading data</div>
            <div className="text-sm text-gray-600">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Global Filter */}
      {filterable && (
        <div className="mb-4">
          <Input
            placeholder="Search..."
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              onGlobalFilterChange?.(e.target.value);
            }}
            leftIcon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {selectable && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className={cn(
                      "px-4 py-3 text-sm font-medium text-gray-900",
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right",
                      column.sortable !== false && sortable && "cursor-pointer hover:bg-gray-100"
                    )}
                    style={{ width: column.width }}
                    onClick={() => column.sortable !== false && sortable && handleSort(column.id)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.header}</span>
                      {column.sortable !== false && sortable && getSortIcon(column.id)}
                    </div>
                  </th>
                ))}
                {actions.length > 0 && (
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {emptyState || "No data available"}
                  </td>
                </tr>
              ) : (
                data.map((item, index) => {
                  const rowId = getRowId(item, index);
                  const isSelected = selectedRows.includes(rowId);

                  return (
                    <tr
                      key={rowId}
                      className={cn(
                        "bg-white hover:bg-gray-50",
                        rowClickable && "cursor-pointer",
                        isSelected && "bg-blue-50",
                        getRowClassName?.(item, index)
                      )}
                      onClick={() => rowClickable && onRowClick?.(item)}
                    >
                      {selectable && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleRowSelect(rowId, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                      )}
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className={cn(
                            "px-4 py-3 text-sm text-gray-900",
                            column.align === "center" && "text-center",
                            column.align === "right" && "text-right"
                          )}
                        >
                          {renderCell(column, item, index)}
                        </td>
                      ))}
                      {actions.length > 0 && (
                        <td className="px-4 py-3 text-right text-sm">
                          <div className="flex items-center justify-end space-x-2">
                            {actions.map((action, actionIndex) => (
                              <Button
                                key={actionIndex}
                                size="sm"
                                variant={action.variant || "outline"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  action.onClick(item);
                                }}
                                disabled={action.disabled?.(item)}
                                leftIcon={action.icon}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <TablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
};

// Pagination component
interface TablePaginationProps {
  pagination: PaginationConfig;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

const TablePagination: React.FC<TablePaginationProps> = ({
  pagination,
  onPageChange,
  onPageSizeChange,
}) => {
  const { page, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const getPageNumbers = () => {
    const pages = [];
    const showPages = 5;

    let start = Math.max(1, page - Math.floor(showPages / 2));
    let end = Math.min(totalPages, start + showPages - 1);

    if (end - start < showPages - 1) {
      start = Math.max(1, end - showPages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
      <div className="flex items-center space-x-2 text-sm text-gray-700">
        <span>Show</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>entries</span>
      </div>

      <div className="text-sm text-gray-700">
        Showing {startItem} to {endItem} of {total} entries
      </div>

      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(1)}
          disabled={page === 1}
        >
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(page - 1)}
          disabled={page === 1}
        >
          Previous
        </Button>

        {getPageNumbers().map((pageNum) => (
          <Button
            key={pageNum}
            variant={pageNum === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange?.(pageNum)}
          >
            {pageNum}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(page + 1)}
          disabled={page === totalPages}
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(totalPages)}
          disabled={page === totalPages}
        >
          Last
        </Button>
      </div>
    </div>
  );
};

DataTable.displayName = "DataTable";

export { DataTable };