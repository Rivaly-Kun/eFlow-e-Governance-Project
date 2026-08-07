import type { UserRole } from '../../../../types';

export type PdsEmployeeNotes = {
  strengths: string;
  weaknesses: string;
  notes: string;
  tags: string[];
};

export type PdsUserDefaults = {
  fullName: string;
  email: string;
  departmentId: string;
  role: UserRole;
  workload: number;
  burnoutLevel: "low";
  status: "active";
};

export type ParsedPdsImport = {
  profile: PdsUserDefaults;
  employeeNotes: PdsEmployeeNotes;
};

export type DepartmentOption = {
  value: string;
  label: string;
};

export type SheetRows = string[][];

export type WorkExperience = {
  from: string;
  to: string;
  position: string;
  office: string;
};

export type Eligibility = {
  title: string;
  rating: string;
};

export type Education = {
  level: string;
  degree: string;
  to: string;
  yearGraduated: string;
  highestLevel: string;
};

export type Training = {
  title: string;
  type: string;
};
