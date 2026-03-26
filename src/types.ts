export interface DoctorInfo {
  name: string;
  specialty: string;
  phone: string;
}

export interface PatientInfo {
  lastName: string;
  firstName: string;
  date: string;
  weight: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  duration: string;
  posology: {
    morning: boolean;
    noon: boolean;
    evening: boolean;
    night: boolean;
  };
}
