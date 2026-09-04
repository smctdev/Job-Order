// utils/job-order-pagination.ts

// Rows that fit on the FIRST printed page/copy (it also carries the
// vehicle info + diagnosis section, so less room for the tables).
export const JOB_ORDER_FIRST_PAGE_ITEMS = 12;
// Rows that fit on each SUBSEQUENT page/copy (continuation pages skip
// the vehicle info + diagnosis section, so more room for the tables).
export const JOB_ORDER_SUBSEQUENT_PAGE_ITEMS = 20;


export const getJobOrderPageRange = (
  page: number,
): { start: number; end: number } => {
  if (page <= 0) {
    return { start: 0, end: JOB_ORDER_FIRST_PAGE_ITEMS };
  }
  const start =
    JOB_ORDER_FIRST_PAGE_ITEMS +
    (page - 1) * JOB_ORDER_SUBSEQUENT_PAGE_ITEMS;
  return { start, end: start + JOB_ORDER_SUBSEQUENT_PAGE_ITEMS };
};

// Helper for parents: how many print pages are needed to fit ALL
// job/part rows (not capped to 30 items / 2 pages anymore). First page
// holds JOB_ORDER_FIRST_PAGE_ITEMS rows, every page after that holds
// JOB_ORDER_SUBSEQUENT_PAGE_ITEMS rows.
export const getJobOrderPrintPageCount = (
  data?: Record<string, any>,
): number => {
  const jobs =
    data?.job_order_details?.filter(
      (item: any) => item.type === "job_request",
    ) || [];
  const parts =
    data?.job_order_details?.filter(
      (item: any) => item.type === "parts_replacement",
    ) || [];
  const maxItems = Math.max(jobs.length, parts.length);
  if (maxItems <= JOB_ORDER_FIRST_PAGE_ITEMS) return 1;
  const remaining = maxItems - JOB_ORDER_FIRST_PAGE_ITEMS;
  return 1 + Math.ceil(remaining / JOB_ORDER_SUBSEQUENT_PAGE_ITEMS);
};
