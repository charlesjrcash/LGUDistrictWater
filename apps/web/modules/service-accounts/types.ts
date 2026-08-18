import type { CustomerSummary, ReferenceOption } from "@/modules/service-applications/types";

export type AccountStatus = ReferenceOption & { description?: string | null };

export type ApplicationReference = {
  applicationNo: string;
  applicationType: string;
  applicationDate: string;
  status: string;
  statusCode: string;
};

export type ServiceAccountRow = {
  controlNo: string;
  customerName: string;
  customerNo: string;
  classification: string;
  classificationCode: string;
  connectionType: string;
  connectionTypeCode: string;
  dateConnected: string | null;
  status: string;
  statusCode: string;
};

export type ServiceAccountDetail = ServiceAccountRow & {
  customer: CustomerSummary;
  application: ApplicationReference | null;
  createdAt: string;
  updatedAt: string | null;
};

export type CreateAccountContext = {
  application: ApplicationReference;
  customer: CustomerSummary;
  existingControlNo: string | null;
};
