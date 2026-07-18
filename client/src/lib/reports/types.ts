export type ReportFilterKey =
  | "branch"
  | "category"
  | "department"
  | "customer"
  | "dateRange"
  | "groupBySku";

export type ReportFilters = {
  branchId?: string;
  category?: string;
  department?: string;
  customerId?: string;
  from?: string;
  to?: string;
  groupBySku?: boolean;
};

export type ReportExportData = {
  filename: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  title: string;
};
