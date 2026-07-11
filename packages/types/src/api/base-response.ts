export interface BaseResponse<T = unknown | null> {
  status?: number;
  message: string;
  data?: T;
  meta?: Metadata;
  metaData?: Metadata;
};

export interface BaseResponseDropdown {
  value: string;
  label: string;
  nik?: string | null;
}

export interface Metadata {
  page?: number;
  pageSize?: number;
  total?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}
