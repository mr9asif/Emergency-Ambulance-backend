export interface ICreateDispatchAssignment {
  hospitalId: string;
  ambulanceId: string;
  driverId: string;
}

export interface IRejectDispatchAssignment {
  rejectionReason: string;
}
