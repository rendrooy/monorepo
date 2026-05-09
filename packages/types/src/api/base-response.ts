export interface BaseResponse<T = any|null> {
  status?: number;
  message: string;
  data?: T;
};

export interface Metadata {
  total?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}
