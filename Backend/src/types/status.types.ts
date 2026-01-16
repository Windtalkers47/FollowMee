export interface StatusCount {
  status: string;
  count: number;
}

export interface StatusCountsResponse {
  statuses: StatusCount[];
  total: number;
}
