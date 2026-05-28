export interface BaseResponse<T = any | null> {
  status?: number;
  message: string;
  data?: T;
  meta?: Metadata;
};

export interface BaseResponseDropdown {
  value: string;
  label: string;
}

export interface Metadata {
  page?: number;
  pageSize?: number;
  total?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}
