export type ReferenceOption = { code: string; name: string };

export type ApplicationStatus = ReferenceOption & { description?: string | null };

export type CustomerSummary = {
  customerNo: string;
  name: string;
  address: string | null;
  barangay: string | null;
  contactNo: string | null;
  status: string;
};

export type ServiceApplicationRow = {
  applicationNo: string;
  customerName: string;
  customerNo: string;
  applicationType: string;
  applicationTypeCode: string;
  applicationDate: string;
  status: string;
  statusCode: string;
};

export type ServiceApplicationDetail = ServiceApplicationRow & {
  customer: CustomerSummary;
  remarks: string | null;
  statuses: ApplicationStatus[];
  createdAt: string;
  updatedAt: string | null;
  serviceAccountControlNo: string | null;
};
