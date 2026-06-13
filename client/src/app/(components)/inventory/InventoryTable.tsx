"use client";

import { useMemo } from "react";
import { DataGrid, type GridColDef, type GridRowParams } from "@mui/x-data-grid";
import StatusBadge from "@/app/(components)/StatusBadge";
import { formatCurrency } from "@/lib/format";
import type { InventoryItem } from "@/lib/types";

type InventoryTableProps = {
  rows: InventoryItem[];
  onRowClick: (item: InventoryItem) => void;
};

export default function InventoryTable({ rows, onRowClick }: InventoryTableProps) {
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Product",
        flex: 1.5,
        minWidth: 220,
        renderCell: (params) => (
          <div className="flex items-center gap-2 py-1">
            {params.row.images?.[0]?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={params.row.images[0].url}
                alt={params.row.name}
                loading="lazy"
                className="w-11 h-11 rounded-lg flex-shrink-0 object-cover border"
                style={{ borderColor: "var(--border)" }}
              />
            ) : (
              <div
                className="w-11 h-11 rounded-lg flex-shrink-0"
                style={{ backgroundColor: "var(--bg-muted)" }}
              />
            )}
            <div>
              <p className="font-medium text-[13px] text-zinc-900">
                {params.row.name}
              </p>
              <p className="text-[11px] font-mono text-zinc-400">
                {params.row.sku}
              </p>
            </div>
          </div>
        ),
      },
      { field: "category", headerName: "Category", flex: 0.8, minWidth: 100 },
      {
        field: "metal",
        headerName: "Metal",
        flex: 0.7,
        minWidth: 90,
        renderCell: (params) => `${params.row.metal} ${params.row.purity}`,
      },
      {
        field: "weightGrams",
        headerName: "Weight",
        flex: 0.6,
        minWidth: 80,
        renderCell: (params) => `${params.row.weightGrams}g`,
      },
      {
        field: "stock",
        headerName: "Qty",
        flex: 0.5,
        minWidth: 70,
        renderCell: (params) => (
          <span className="font-medium">{params.row.stock}</span>
        ),
      },
      {
        field: "price",
        headerName: "Price",
        flex: 0.8,
        minWidth: 110,
        renderCell: (params) => formatCurrency(params.row.price),
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.8,
        minWidth: 110,
        renderCell: (params) => <StatusBadge status={params.row.status} />,
      },
    ],
    [],
  );

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      autoHeight
      disableRowSelectionOnClick
      pageSizeOptions={[5, 10, 25]}
      initialState={{ pagination: { paginationModel: { pageSize: 8 } } }}
      onRowClick={(params: GridRowParams<InventoryItem>) =>
        onRowClick(params.row)
      }
      sx={{
        width: "100%",
        border: "none",
        fontSize: "13px",
        cursor: "pointer",
        color: "#18181b",
        "& .MuiDataGrid-columnHeaders": {
          backgroundColor: "#fafafa",
          color: "#71717a",
          fontSize: "12px",
          fontWeight: 500,
          borderBottom: "1px solid #e4e4e7",
        },
        "& .MuiDataGrid-cell": {
          borderColor: "#f4f4f5",
        },
        "& .MuiDataGrid-row:hover": {
          backgroundColor: "#fafafa",
        },
        "& .MuiDataGrid-footerContainer": {
          borderTop: "1px solid #e4e4e7",
        },
      }}
    />
  );
}
