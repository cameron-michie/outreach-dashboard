'use client';

import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type Row,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, MoreHorizontal, Search } from 'lucide-react';
import { Button } from './button';
import { Input } from './Input';
import { Checkbox } from './checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { cn } from '@/lib/utils';

interface TnksDataTableProps<T> {
  data: T[];
  columns: {
    key: string;
    label: string;
    render?: (value: any, row: T, index: number) => React.ReactNode;
    sortable?: boolean;
    filterable?: boolean;
    width?: string | number;
    align?: 'left' | 'center' | 'right';
  }[];
  loading?: boolean;
  error?: string;
  className?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  getRowId?: (item: T, index: number) => string;
}

export function TnksDataTable<T extends Record<string, any>>({
  data,
  columns: columnDefs,
  loading = false,
  error,
  className,
  pagination,
  onPageChange,
  onPageSizeChange,
  globalFilter = '',
  onGlobalFilterChange,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  getRowId = (item, index) => item.id || index.toString(),
}: TnksDataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [filter, setFilter] = React.useState(globalFilter);

  // Convert our column definitions to TanStack Table format
  const columns = React.useMemo<ColumnDef<T>[]>(() => {
    const cols: ColumnDef<T>[] = [];

    // Add selection column if selectable
    if (selectable) {
      cols.push({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      });
    }

    // Add data columns
    columnDefs.forEach((col) => {
      cols.push({
        id: col.key,
        accessorKey: col.key,
        header: col.label,
        cell: ({ getValue, row, cell }) => {
          const value = getValue();
          if (col.render) {
            return col.render(value, row.original, row.index);
          }
          return value?.toString() || '';
        },
        enableSorting: col.sortable !== false,
        meta: {
          align: col.align || 'left',
          width: col.width,
        },
      });
    });

    return cols;
  }, [columnDefs, selectable]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: filter,
    },
    onGlobalFilterChange: setFilter,
    getRowId: (row, index) => getRowId(row, index),
  });

  // Handle external filter changes
  React.useEffect(() => {
    setFilter(globalFilter);
    table.setGlobalFilter(globalFilter);
  }, [globalFilter, table]);

  // Handle selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedIds = table.getSelectedRowModel().rows.map(row => row.id);
      onSelectionChange(selectedIds);
    }
  }, [rowSelection, onSelectionChange, table]);

  const getSortIcon = (isSorted: false | 'asc' | 'desc') => {
    if (isSorted === 'asc') {
      return <ChevronUp className="h-4 w-4" />;
    }
    if (isSorted === 'desc') {
      return <ChevronDown className="h-4 w-4" />;
    }
    return <ChevronDown className="h-4 w-4 opacity-0 group-hover:opacity-50" />;
  };

  if (loading) {
    return (
      <div className={cn('w-full', className)}>
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
        <div className="border rounded-lg">
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="mt-2 text-sm text-gray-600">Loading data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('w-full', className)}>
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
    <div className={cn('w-full', className)}>
      {/* Global Filter */}
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

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.getCanSort() && 'cursor-pointer select-none group',
                      header.column.columnDef.meta?.align === 'center' && 'text-center',
                      header.column.columnDef.meta?.align === 'right' && 'text-right'
                    )}
                    style={{ width: header.column.columnDef.meta?.width }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center space-x-1">
                      <span>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </span>
                      {header.column.getCanSort() && getSortIcon(header.column.getIsSorted())}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.columnDef.meta?.align === 'center' && 'text-center',
                        cell.column.columnDef.meta?.align === 'right' && 'text-right'
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <span>Show</span>
            <select
              value={pagination.pageSize}
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
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} entries
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(1)}
              disabled={pagination.page === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(Math.ceil(pagination.total / pagination.pageSize))}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}