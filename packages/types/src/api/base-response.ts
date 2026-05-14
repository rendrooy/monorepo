export interface BaseResponse<T = any|null> {
  status?: number;
  message: string;
  data?: T;
  meta?: Metadata;
};

export interface BaseResponseDropdown<T = any|null> {
  value: string;
  label: string;
}

export interface Metadata {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}
