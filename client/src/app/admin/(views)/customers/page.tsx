"use client";

import TableLoader from "@/components/table-loader";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import { PER_PAGE_OPTIONS } from "@/constants/perPageOptipns";
import useFetch from "@/hooks/useFetch";
import withAuthPage from "@/lib/hoc/with-auth-page";
import { api } from "@/lib/api";
import { ADMIN_ACCESS } from "@/lib/permissions";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Search, SearchSlash } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { FaCircleNotch, FaFileExcel, FaRotateRight } from "react-icons/fa6";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const MONTHS = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

const YEARS = Array.from({ length: new Date().getFullYear() - 2020 + 1 })
  .map((_, index) => 2020 + index)
  .sort((a, b) => b - a);

const Customers = () => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [users, setUsers] = useState<any[]>([]);
  // Empty string = "All"
  const [filters, setFilters] = useState<{
    user_id: string;
    month: string;
    year: string;
  }>({
    user_id: "",
    month: "",
    year: "",
  });

  const {
    data: customers,
    isLoading,
    error,
    pagination,
    sort,
    isRefresh,
    isSearching,
    searchTerm,
    handleSort,
    handleRowsPerPageChange,
    handlePageChange,
    handleSearch,
    handleRefresh,
    setIsLoading,
  } = useFetch("/customers", { filterItems: filters });

  // Load the "Printed By" options (branches/users)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // NOTE: adjust this endpoint/params to match your API
        const response = await api.get("/user-selection-options");
        const list = response.data?.data ?? response.data ?? [];
        setUsers(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error(err);
      }
    };
    loadUsers();
  }, []);

  const handleFilterChange =
    (key: "user_id" | "month" | "year") =>
    (e: ChangeEvent<HTMLSelectElement>) => {
      setIsLoading(true);
      setFilters((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const columns = [
    {
      name: "ID",
      selector: (row: any) => row.id,
      sortable: true,
      sortField: "id",
      width: "80px",
    },
    {
      name: "NAME",
      selector: (row: any) => row.name,
      sortable: true,
      sortField: "name",
    },
    {
      name: "PRINTED BY",
      cell: (row: any) => (
        <div>
          {row.user.name}{" "}
          <span className="font-bold text-gray-600">({row.user.code})</span>
        </div>
      ),
    },
    {
      name: "ADDRESS",
      selector: (row: any) => row.address,
      sortable: true,
      sortField: "address",
    },
    {
      name: "CONTACT NUMBER",
      selector: (row: any) => row.contact_number,
      sortable: true,
      sortField: "contact_number",
    },
    {
      name: "CREATED AT",
      cell: (row: any) => (
        <>
          <div className="flex flex-col">
            <span className="text-sm">
              {format(row.created_at, "MMM dd, yyyy hh:mm a")}
            </span>
            <span className="text-gray-500 text-xs font-bold">
              {formatDistanceToNowStrict(row.created_at, { addSuffix: true })}
            </span>
          </div>
        </>
      ),
      sortable: true,
      sortField: "created_at",
    },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params: Record<string, string> = {};
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.month) params.month = filters.month;
      if (filters.year) params.year = filters.year;
      if (searchTerm) params.search = searchTerm;

      const response = await api.get("/customers/export", { params });

      if (response.status === 200) {
        const rows = (response.data.data ?? []).map((row: any) => ({
          Name: row.name,
          "Printed By": `(${row.user?.code}) - ${row.user?.name}`,
          Address: row.address,
          "Contact Number": row.contact_number,
          "Created At": format(row.created_at, "MMM dd, yyyy hh:mm a"),
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = [
          { wch: 30 },
          { wch: 35 },
          { wch: 40 },
          { wch: 20 },
          { wch: 24 },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

        const excelBuffer = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });
        const blob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const selectedUser = users.find(
          (u) => String(u.id) === String(filters.user_id),
        );
        const userLabel = selectedUser?.code ?? "all-branches";
        const monthLabel =
          MONTHS.find((m) => String(m.value) === String(filters.month))
            ?.label ?? "all-months";
        const yearLabel = filters.year || "all-years";

        saveAs(blob, `customers-${userLabel}-${monthLabel}-${yearLabel}.xlsx`);
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Export failed",
        text:
          err?.response?.data?.message ||
          "Something went wrong. Please try again later.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const selectClass =
    "border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-fit";

  return (
    <>
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-300 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Job Order Printing System — Customers Overview
              </p>
            </div>

            <div className="flex gap-1 items-center lg:flex-row flex-col">
              <div>
                <Select
                  value={filters.user_id}
                  onChange={handleFilterChange("user_id")}
                  className={selectClass}
                >
                  <option value="">All Branches</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      ({u.code}) - {u.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Select
                  value={filters.month}
                  onChange={handleFilterChange("month")}
                  className={selectClass}
                >
                  <option value="">All Months</option>
                  {MONTHS.map(({ label, value }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Select
                  value={filters.year}
                  onChange={handleFilterChange("year")}
                  className={selectClass}
                >
                  <option value="">All Years</option>
                  {YEARS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="relative w-full">
                <Input
                  type="search"
                  placeholder="Search..."
                  onChange={handleSearch}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              <Button
                type="button"
                disabled={isRefresh}
                className={`bg-yellow-500 hover:bg-yellow-400 text-white py-5 ${
                  isRefresh && "bg-yellow-400! cursor-not-allowed!"
                }`}
                onClick={handleRefresh}
              >
                {isRefresh ? (
                  <>
                    <FaCircleNotch className="animate-spin" /> Refreshing...
                  </>
                ) : (
                  <>
                    <FaRotateRight /> Refresh
                  </>
                )}
              </Button>
              <Button
                type="button"
                className="bg-emerald-500 hover:bg-emerald-600 text-white py-5"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <FaCircleNotch className="animate-spin" /> Exporting...
                  </>
                ) : (
                  <>
                    <FaFileExcel /> Export
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto border-t">
            <DataTable
              columns={columns}
              data={customers}
              pagination
              paginationServer
              sortServer
              onSort={handleSort}
              paginationTotalRows={pagination.total}
              onChangeRowsPerPage={handleRowsPerPageChange}
              onChangePage={handlePageChange}
              paginationPerPage={pagination.perPage}
              striped
              highlightOnHover
              progressPending={
                isLoading || isRefresh || isSearching || pagination.isLoading
              }
              progressComponent={
                <TableLoader
                  isSearching={isSearching}
                  searchTerm={searchTerm}
                />
              }
              persistTableHead
              paginationRowsPerPageOptions={PER_PAGE_OPTIONS}
              defaultSortAsc={sort.sortBy}
              defaultSortFieldId={sort.column}
              noDataComponent={
                <div className="py-5 font-bold text-gray-600 text-xl">
                  {searchTerm ? (
                    <>
                      <span className="flex gap-1 items-center">
                        <SearchSlash /> No results for "{searchTerm}"
                      </span>
                    </>
                  ) : (
                    "No customers yet."
                  )}
                </div>
              }
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default withAuthPage(Customers, ADMIN_ACCESS);