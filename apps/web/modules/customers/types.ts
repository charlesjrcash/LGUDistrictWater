export type CustomerOption = { code: string; name: string };
export type PurokOption = CustomerOption & { barangayCode: string };

export type CustomerRecord = {
  customerNo: string;
  customerName: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  address: string | null;
  barangay: string | null;
  barangayCode: string | null;
  purok: string | null;
  purokCode: string | null;
  contactNo: string | null;
  email: string | null;
  status: string;
};

export type CustomerListRow = CustomerRecord & {
  applicationCount: number;
  serviceAccountCount: number;
};

export type CustomerApplication = {
  applicationNo: string;
  applicationType: string;
  applicationDate: string;
  status: string;
  statusCode: string;
};
export type CustomerServiceAccount = {
  controlNo: string;
  classification: string;
  connectionType: string;
  status: string;
  statusCode: string;
};
export type CustomerDetail = CustomerRecord & {
  applications: CustomerApplication[];
  serviceAccounts: CustomerServiceAccount[];
};
