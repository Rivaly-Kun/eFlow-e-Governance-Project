import * as XLSX from 'xlsx';
import type { DepartmentOption, ParsedPdsImport } from './types';
import { parseEducation, parseEligibility, parseFullName, parseEmail, parseSpecialSkills, parseTrainings, parseWorkExperience } from './extractors';
import { buildNotes, buildStrengths, buildTags } from './notes';
import { resolveDepartmentId } from './valueUtils';
import { readRows, validatePdsWorkbook } from './workbookRows';

export const parsePdsWorkbook = (
  data: ArrayBuffer,
  departments: DepartmentOption[] = [],
): ParsedPdsImport => {
  const workbook = XLSX.read(data, { type: "array", cellDates: false });
  const rowsBySheet = {
    C1: readRows(workbook, "C1"),
    C2: readRows(workbook, "C2"),
    C3: readRows(workbook, "C3"),
  };

  validatePdsWorkbook(workbook, rowsBySheet);

  const education = parseEducation(rowsBySheet.C1);
  const eligibility = parseEligibility(rowsBySheet.C2);
  const workExperience = parseWorkExperience(rowsBySheet.C2);
  const currentWork =
    workExperience.find((experience) => /present/i.test(experience.to)) ||
    workExperience[0];
  const trainings = parseTrainings(rowsBySheet.C3);
  const specialSkills = parseSpecialSkills(rowsBySheet.C3);
  const departmentId = resolveDepartmentId(currentWork?.office || "", departments);

  return {
    profile: {
      fullName: parseFullName(rowsBySheet.C1),
      email: parseEmail(rowsBySheet.C1),
      departmentId,
      role: "employee",
      workload: 0,
      burnoutLevel: "low",
      status: "active",
    },
    employeeNotes: {
      notes: buildNotes(currentWork, education, eligibility),
      strengths: buildStrengths(currentWork, trainings),
      tags: buildTags(currentWork, education, trainings, specialSkills),
      weaknesses: "",
    },
  };
};

export const parsePdsFile = async (
  file: File,
  departments: DepartmentOption[] = [],
) => parsePdsWorkbook(await file.arrayBuffer(), departments);
