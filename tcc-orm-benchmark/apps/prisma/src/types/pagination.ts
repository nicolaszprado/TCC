export type Pagination = {
  page: number;
  limit: number;
};

export type PaginationResponse = Pagination & {
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationResponse;
};
